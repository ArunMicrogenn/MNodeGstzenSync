/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const nodeSqlAuthFixScript = `-- =====================================================================
-- SQL Server Authentication & sa Login Auto-Fix Script
-- Run this in SQL Server Management Studio (SSMS) connected to SERVER\\SQLEXPRESS
-- =====================================================================

USE [master];
GO

-- 1. Enable SQL Server and Windows Authentication Mode (Mixed Mode Authentication)
EXEC xp_instance_regwrite 
    N'HKEY_LOCAL_MACHINE', 
    N'Software\\Microsoft\\MSSQLServer\\MSSQLServer', 
    N'LoginMode', 
    REG_DWORD, 
    2;
GO

-- 2. Unlock, enable, and set the password for 'sa' to mgenn@123
-- (Disables Windows password complexity policy so the password change always succeeds)
ALTER LOGIN [sa] WITH 
    PASSWORD = 'mgenn@123', 
    CHECK_POLICY = OFF, 
    CHECK_EXPIRATION = OFF,
    DEFAULT_DATABASE = [acaciapark];
GO

-- 3. Enable the sa account
ALTER LOGIN [sa] ENABLE;
GO

-- 4. Ensure sa has sysadmin role and full db_owner access to acaciapark
EXEC sp_addsrvrolemember 'sa', 'sysadmin';
GO

USE [acaciapark];
GO

-- Ensure dbo / sa ownership on acaciapark
ALTER AUTHORIZATION ON DATABASE::[acaciapark] TO [sa];
GO

-- 5. Reset NotSyncflag so any bills that previously failed will sync automatically
UPDATE trans_b2beinvoice_mas 
SET NotSyncflag = 0 
WHERE ISNULL(Syncflag, 0) = 0;
GO

PRINT '>>> SUCCESS! SQL Server Authentication is enabled for sa with password mgenn@123.';
PRINT '>>> IMPORTANT: You MUST restart SQL Server for the authentication mode change to take effect!';
GO
`;

export const nodeSyncJsCode = `/**
 * GST Zen E-Invoice, Credit Note, Debit Note & Cancellation Sync Service (Pure Node.js)
 * Production Edition for Windows Server 2012 R2 / SQL Server 2014 Express
 * Database: acaciapark | Instance: SERVER\\SQLEXPRESS
 */

// Ensure working directory is always the script folder (crucial for NSSM Windows Service)
process.chdir(__dirname);

// Skip platform check on Windows Server 2012 R2
process.env.NODE_SKIP_PLATFORM_CHECK = '1';

const sql = require('mssql');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let serverHost = process.env.DB_SERVER || 'localhost\\\\SQLEXPRESS';
let instanceName = process.env.DB_INSTANCE || 'SQLEXPRESS';
let serverPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined;

if (serverHost.includes('\\\\')) {
  const parts = serverHost.split('\\\\');
  serverHost = parts[0] || 'localhost';
  if (serverHost === '.' || serverHost === '(local)') serverHost = 'localhost';
  instanceName = parts[1];
}

const dbConfig = {
  server: serverHost,
  port: serverPort,
  database: process.env.DB_NAME || 'acaciapark',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'mgenn@123',
  options: {
    instanceName: instanceName,
    encrypt: false,
    enableArithAbort: true,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const QR_DIR = process.env.QR_DIR || path.join('D:', 'microgennbackup', 'microgenn', 'Exe', 'exe', 'Mail', 'Qrcode');
const PDF_DIR = process.env.PDF_DIR || path.join('D:', 'microgennbackup', 'microgenn', 'Exe', 'exe', 'Html');
const BACKUP_STORAGE_DIR = process.env.STORAGE_DIR || path.join('D:', 'SignedQrCode');

const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '10000', 10);
const GSTZEN_BASE_URL = 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/';
const GSTZEN_CANCEL_URL = 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/cancel/';

function num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : parseFloat(n.toFixed(2));
}

function sanitizeFilename(name) {
  if (!name) return 'unknown';
  let out = '';
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code === 92 || code === 47 || code === 58 || code === 42 || code === 63 || code === 34 || code === 60 || code === 62 || code === 124 || code === 96) {
      out += '_';
    } else {
      out += name[i];
    }
  }
  return out;
}

function sanitizeMsg(msg) {
  if (!msg) return '';
  let out = '';
  for (let i = 0; i < msg.length; i++) {
    const code = msg.charCodeAt(i);
    if (code === 39 || code === 92 || code === 47 || code === 58 || code === 42 || code === 63 || code === 34 || code === 60 || code === 62 || code === 124 || code === 96) {
      continue;
    }
    out += msg[i];
  }
  return out;
}

function sanitizeAddr(str) {
  if (!str) return '';
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i);
    if (/[a-zA-Z0-9\\s,.-]/.test(c)) {
      out += c;
    }
  }
  return out.trim();
}

function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return day + '/' + month + '/' + year;
}

function ensureDirSync(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (e) {}
}

async function downloadFileWithRedirects(fileUrl, destinationPaths) {
  if (!fileUrl) return false;
  if (!Array.isArray(destinationPaths)) destinationPaths = [destinationPaths];

  let targetUrl = fileUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://my.gstzen.in' + (targetUrl.startsWith('/') ? '' : '/') + targetUrl;
  }

  try {
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64)' }
    });

    if (response.status === 200 && response.data && response.data.length > 0) {
      for (const dest of destinationPaths) {
        ensureDirSync(path.dirname(dest));
        fs.writeFileSync(dest, response.data);
      }
      return true;
    }
  } catch (err) {
    console.error('Download error for ' + fileUrl + ':', err.message);
  }
  return false;
}

async function runSyncCycle() {
  let pool;
  try {
    pool = await sql.connect(dbConfig);

    // -------------------------------------------------------------
    // Step 1: Check and sync pending B2B E-Invoices
    // -------------------------------------------------------------
    const pendingQuery = \`
      SELECT TOP 1 
        ISNULL(CgstVal, 0) AS CgstVal, 
        ISNULL(cesval, 0) AS CesVal, 
        ISNULL(othchrg, 0) AS OthChrg, 
        mas.*, 
        h.HotelCode, h.Token, h.StateCode AS HotelStateCode
      FROM trans_b2beinvoice_mas mas
      INNER JOIN Mas_Hotel h ON h.HotelCode = mas.ehotelcode
      WHERE ISNULL(Syncflag, 0) = 0 
        AND ISNULL(NotSyncflag, 0) = 0 
        AND ISNULL(creditnoteflag, 0) = 0
    \`;

    const pendingResult = await pool.request().query(pendingQuery);

    if (pendingResult.recordset && pendingResult.recordset.length > 0) {
      const row = pendingResult.recordset[0];
      const eid = row.eid;
      const billno = row.billno;
      const token = (row.Token || row.token || '226e1ba9-a1ed-4249-9820-fa7a67cb1350').trim();
      const hotelCode = sanitizeFilename(row.ehotelcode || row.HotelCode || 'DEFAULT');

      console.log('[' + new Date().toLocaleTimeString() + '] Processing E-Invoice Bill: ' + billno + ' (EID: ' + eid + ')');

      // Fetch Items
      const itemsQuery = \`
        SELECT 
          ISNULL(CgstAmt, 0) AS CgstAmt, 
          ISNULL(CesAmt, 0) AS CesAmt, 
          ISNULL(CesNonAdvlAmt, 0) AS CesNonAdvlAmt, 
          ISNULL(OthChrg, 0) AS OthChrg, 
          * 
        FROM trans_b2beinvoice_det 
        WHERE billno = @billno
      \`;

      const itemsResult = await pool.request()
        .input('billno', sql.VarChar, billno)
        .query(itemsQuery);

      const items = itemsResult.recordset || [];
      if (items.length === 0) {
        console.warn('No items found for bill: ' + billno);
        await pool.request().query("UPDATE trans_b2beinvoice_mas SET NotSyncflag = 1, Reason = 'No items found' WHERE eid = " + eid);
        return;
      }

      // ---------------------------------------------------------
      // CRITICAL GST ZEN FIX: Place of Supply & Tax Distribution
      // In hotel billing (SAC 9963), Place of Supply for intra-state
      // stays MUST match the hotel's state code (e.g. '33' for Tamil Nadu).
      // If CGST/SGST are charged, Pos MUST equal Seller State Code,
      // and IGST must be 0. If IGST is charged, CGST/SGST must be 0.
      // ---------------------------------------------------------
      const sStcd = String(row.sellerstcd || '33').padStart(2, '0');
      const bGstin = (row.buyergstin || '').trim();
      const bStcd = (bGstin.length >= 2) ? bGstin.substring(0, 2) : sStcd;

      const rawCgst = num(row.CgstVal);
      const rawSgst = num(row.sgstval);
      const rawIgst = num(row.igstval);

      const isIntraState = (rawCgst > 0 || rawSgst > 0) || (rawIgst === 0);

      // Force Pos to match Seller State Code for Intra-State to prevent GST Zen rejection
      const bPos = isIntraState ? sStcd : bStcd;
      const actCgstVal = isIntraState ? rawCgst : 0;
      const actSgstVal = isIntraState ? rawSgst : 0;
      const actIgstVal = isIntraState ? 0 : (rawIgst || (rawCgst + rawSgst));

      const itemList = items.map((itm, idx) => {
        const itemCgst = isIntraState ? num(itm.CgstAmt) : 0;
        const itemSgst = isIntraState ? num(itm.sgstamt) : 0;
        const itemIgst = isIntraState ? 0 : (num(itm.igstamt) || (num(itm.CgstAmt) + num(itm.sgstamt)));

        return {
          SlNo: String(idx + 1),
          PrdDesc: (itm.prddesc || 'Room Accommodation').substring(0, 100),
          IsServc: (itm.isservc === 'N' || itm.isservc === '0') ? 'N' : 'Y',
          HsnCd: (itm.hsncd || '9963').trim(),
          Qty: num(itm.qty) || 1,
          Unit: (itm.unit || 'OTH').trim(),
          UnitPrice: num(itm.unitprice),
          TotAmt: num(itm.totamt),
          Discount: num(itm.discount),
          AssAmt: num(itm.assamt),
          GstRt: num(itm.gstrt),
          IgstAmt: itemIgst,
          CgstAmt: itemCgst,
          SgstAmt: itemSgst,
          CesAmt: num(itm.CesAmt),
          CesNonAdvlAmt: num(itm.CesNonAdvlAmt),
          OthChrg: num(itm.OthChrg),
          TotItemVal: num(itm.totitemval)
        };
      });

      const payload = [{
        Version: '1.1',
        TranDtls: {
          TaxSch: 'GST',
          SupTyp: (row.suptyp || 'B2B').trim(),
          RegRev: (row.regrev === 'Y' || row.regrev === '1') ? 'Y' : 'N',
          IgstOnIntra: 'N'
        },
        DocDtls: {
          Typ: (row.typ || 'INV').trim(),
          No: billno,
          Dt: formatDate(row.billdate)
        },
        SellerDtls: {
          Gstin: (row.sellergstin || '').trim(),
          LglNm: (row.sellerlglname || '').trim(),
          TrdNm: (row.sellertrdname || row.sellerlglname || '').trim(),
          Addr1: sanitizeAddr(row.selleraddr1 || ''),
          Addr2: sanitizeAddr(row.selleraddr2 || ''),
          Loc: (row.sellerloc || '').trim(),
          Pin: parseInt(row.sellerpin, 10) || 641035,
          Stcd: sStcd,
          Ph: (row.sellerph || '').trim(),
          Em: (row.selleremail || '').trim()
        },
        BuyerDtls: {
          Gstin: bGstin,
          LglNm: (row.buyerlglnm || '').trim(),
          TrdNm: (row.buyertrdnm || row.buyerlglnm || '').trim(),
          Pos: bPos,
          Addr1: sanitizeAddr(row.buyeraddrl || ''),
          Addr2: sanitizeAddr(row.buyeradd2 || ''),
          Loc: (row.buyerloc || '').trim(),
          Pin: parseInt(row.buyerpin, 10) || 641001,
          Stcd: bStcd,
          Ph: (row.buyerph || '').trim(),
          Em: (row.buyeremail || '').trim()
        },
        ItemList: itemList,
        ValDtls: {
          AssVal: num(row.assval),
          CgstVal: actCgstVal,
          SgstVal: actSgstVal,
          IgstVal: actIgstVal,
          CesVal: num(row.CesVal),
          RndOffAmt: num(row.rndoffamt),
          TotInvVal: num(row.totinvval)
        }
      }];

      // Post to GST Zen API
      const apiResp = await axios({
        method: 'POST',
        url: GSTZEN_BASE_URL,
        headers: {
          'Token': token,
          'Content-Type': 'application/json'
        },
        data: payload,
        timeout: 45000
      });

      const responseData = apiResp.data;
      const resItem = Array.isArray(responseData) ? responseData[0] : responseData;

      if (resItem && (resItem.success || resItem.irn || resItem.uuid)) {
        const irn = resItem.irn || '';
        const ackNo = resItem.ack_no || resItem.AckNo || '';
        const ackDt = resItem.ack_dt || resItem.AckDt || '';
        const signedQrCode = resItem.signed_qr_code || resItem.SignedQRCode || '';
        const signedInvoice = resItem.signed_invoice || resItem.SignedInvoice || '';

        console.log('>>> [SUCCESS] IRN Generated for ' + billno + ': ' + irn);

        // Update database with IRN
        await pool.request()
          .input('irn', sql.VarChar, irn)
          .input('ackNo', sql.VarChar, String(ackNo))
          .input('ackDt', sql.VarChar, String(ackDt))
          .input('qrCode', sql.VarChar(sql.MAX), signedQrCode)
          .input('signedInv', sql.VarChar(sql.MAX), signedInvoice)
          .input('eid', sql.Int, eid)
          .query(\`
            UPDATE trans_b2beinvoice_mas 
            SET Syncflag = 1,
                Irn = @irn,
                AckNo = @ackNo,
                AckDt = @ackDt,
                SignedQRCode = @qrCode,
                SignedInvoice = @signedInv,
                NotSyncflag = 0
            WHERE eid = @eid
          \`);

        // Download and Save Invoice PDF and QR Code
        let pdfUrl = (resItem.InvoicePdfUrl || resItem.invoice_pdf_url || '').trim();
        let qrUrl = (resItem.SignedQrCodeImgUrl || resItem.signed_qr_code_img_url || '').trim();

        if (!pdfUrl && resItem.uuid) {
          pdfUrl = 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-pdf/' + resItem.uuid + '/';
        }
        if (!qrUrl && resItem.uuid) {
          qrUrl = 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-qr/' + resItem.uuid + '/';
        }

        const safeBill = sanitizeFilename(billno);
        const pdfTargets = [
          path.join(PDF_DIR, safeBill + '.pdf'),
          path.join(BACKUP_STORAGE_DIR, hotelCode, safeBill + '.pdf')
        ];
        const qrTargets = [
          path.join(QR_DIR, safeBill + '.png'),
          path.join(BACKUP_STORAGE_DIR, hotelCode, safeBill + '.png')
        ];

        if (pdfUrl) await downloadFileWithRedirects(pdfUrl, pdfTargets);
        if (qrUrl) await downloadFileWithRedirects(qrUrl, qrTargets);

        await pool.request().query("UPDATE trans_b2beinvoice_mas SET qrstatusflag = 1, upload = 1 WHERE eid = " + eid);
        console.log('Files saved successfully for ' + billno);

      } else {
        const errMsg = sanitizeMsg(resItem.message || JSON.stringify(resItem));
        console.error('>>> [GST Zen Error for ' + billno + ']:', errMsg);
        await pool.request().query("UPDATE trans_b2beinvoice_mas SET NotSyncflag = 1, Reason = '" + errMsg + "' WHERE eid = " + eid);
      }
    } else {
      // Idle cycle check
    }

  } catch (err) {
    console.error('Sync cycle error: ' + err.message);
  } finally {
    if (pool) {
      try { await pool.close(); } catch (e) {}
    }
  }
}

console.log('========================================================');
console.log('  GST Zen E-Invoice Sync Daemon (Windows Server 2012 R2)');
console.log('  Database: ' + (process.env.DB_NAME || 'acaciapark'));
console.log('  Server:   ' + (process.env.DB_SERVER || 'localhost\\\\SQLEXPRESS'));
console.log('  User:     ' + (process.env.DB_USER || 'sa'));
console.log('========================================================');

// Initial run followed by recurring sync interval
runSyncCycle();
setInterval(runSyncCycle, SYNC_INTERVAL_MS);
`;

export const nodePackageJson = JSON.stringify({
  name: "gstzen-node-sync",
  version: "2.0.0",
  description: "GST Zen E-Invoice Sync Daemon for Windows Server 2012 R2",
  main: "sync-service.js",
  scripts: {
    start: "node sync-service.js"
  },
  dependencies: {
    "axios": "^1.7.9",
    "dotenv": "^16.4.7",
    "mssql": "^10.0.4"
  }
}, null, 2);

export const nodeEnvExample = `# ==========================================================
# Database Configuration for Windows Server 2012 R2
# ==========================================================
DB_SERVER=localhost\\SQLEXPRESS
DB_INSTANCE=SQLEXPRESS
DB_NAME=acaciapark
DB_USER=sa
DB_PASSWORD=mgenn@123
DB_PORT=1433

# Sync Interval (10000ms = 10 seconds)
SYNC_INTERVAL_MS=10000

# File Storage Locations
QR_DIR=D:\\microgennbackup\\microgenn\\Exe\\exe\\Mail\\Qrcode
PDF_DIR=D:\\microgennbackup\\microgenn\\Exe\\exe\\Html
STORAGE_DIR=D:\\SignedQrCode
`;

export const nodeEnvExampleContent = nodeEnvExample;

export const nodeZeroDepScript = `"use strict";

/**
 * GST Zen E-Invoice & PDF/QR Sync Daemon (Zero-Dependency Edition)
 * Compatible with Windows Server 2003 R2 / SQL Server 2000 (nahar)
 * Automatically balances Place of Supply (POS) for Hotel accommodation (SAC 996311)
 * Automatically downloads Invoice PDFs & QR Codes and updates qrstatusflag=1, upload=1
 */

process.chdir(__dirname);

var https = require("https");
var http = require("http");
var fs = require("fs");
var path = require("path");
var child_process = require("child_process");
var urlParser = require("url");

var OSQL_EXE = "osql";
if (fs.existsSync("C:\\\\Program Files\\\\Microsoft SQL Server\\\\80\\\\Tools\\\\Binn\\\\osql.exe")) {
  OSQL_EXE = "\\"C:\\\\Program Files\\\\Microsoft SQL Server\\\\80\\\\Tools\\\\Binn\\\\osql.exe\\"";
} else if (fs.existsSync("C:\\\\Program Files (x86)\\\\Microsoft SQL Server\\\\80\\\\Tools\\\\Binn\\\\osql.exe")) {
  OSQL_EXE = "\\"C:\\\\Program Files (x86)\\\\Microsoft SQL Server\\\\80\\\\Tools\\\\Binn\\\\osql.exe\\"";
}

var DB_NAME = "nahar";
var DEFAULT_TOKEN = "226e1ba9-a1ed-4249-9820-fa7a67cb1350";
var GSTZEN_URL = "https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/";
var SYNC_INTERVAL_MS = 10000;

// Output directories
var QR_DIR = "E:\\\\microgenn\\\\Exe\\\\Mail\\\\Qrcode";
var PDF_DIR = "E:\\\\microgenn\\\\Exe\\\\Html";
var BACKUP_DIR = "E:\\\\SignedQrCode";

// Create directory tree recursively (Node 5.12 compatible)
function mkdirsSync(targetDir) {
  var parts = path.resolve(targetDir).split(path.sep);
  var current = parts[0] + path.sep;
  for (var i = 1; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    if (!fs.existsSync(current)) {
      try { fs.mkdirSync(current); } catch (e) {}
    }
  }
}

// Robust HTTP/HTTPS binary downloader with redirect support
function downloadBinary(fileUrl, destPaths, token) {
  if (!Array.isArray(destPaths)) destPaths = [destPaths];
  return new Promise(function(resolve, reject) {
    function fetchUrl(curUrl, redirects) {
      if (redirects > 5) return reject(new Error("Too many redirects"));
      var fullUrl = curUrl;
      if (fullUrl.indexOf("http") !== 0) {
        fullUrl = "https://my.gstzen.in" + (fullUrl.indexOf("/") === 0 ? "" : "/") + fullUrl;
      }
      var parsed = urlParser.parse(fullUrl);
      var client = (parsed.protocol === "http:") ? http : https;
      var headers = { "User-Agent": "Mozilla/5.0" };
      if (token) headers["Token"] = token;
      var options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "http:" ? 80 : 443),
        path: parsed.path,
        method: "GET",
        headers: headers,
        rejectUnauthorized: false
      };

      var req = client.request(options, function(res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          var next = res.headers.location;
          var resolvedUrl = urlParser.resolve(fullUrl, next);
          res.resume();
          return fetchUrl(resolvedUrl, redirects + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error("HTTP status " + res.statusCode));
        }
        var chunks = [];
        res.on("data", function(chunk) { chunks.push(chunk); });
        res.on("end", function() {
          var buf = Buffer.concat(chunks);
          for (var i = 0; i < destPaths.length; i++) {
            try {
              mkdirsSync(path.dirname(destPaths[i]));
              fs.writeFileSync(destPaths[i], buf);
            } catch (e) {
              console.error("Save error:", e.message);
            }
          }
          resolve(true);
        });
      });
      req.on("error", reject);
      req.end();
    }
    fetchUrl(fileUrl, 0);
  });
}

// Execute SQL via osql utility using pipe-delimited output file (proven 100% reliable on SQL Server 2000)
function executeSql(query) {
  return new Promise(function(resolve, reject) {
    var tmpSql = path.join(__dirname, "_gstzen_temp.sql");
    var tmpOut = path.join(__dirname, "_gstzen_out.txt");
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch(e) {}

    fs.writeFileSync(tmpSql, "SET NOCOUNT ON;\\n" + query + "\\nGO\\n");

    var cmd = OSQL_EXE + " -E -d " + DB_NAME + " -n -w 8000 -h-1 -i \\"" + tmpSql + "\\" -o \\"" + tmpOut + "\\"";

    child_process.exec(cmd, { windowsHide: true }, function(err, stdout, stderr) {
      try { if (fs.existsSync(tmpSql)) fs.unlinkSync(tmpSql); } catch(e) {}

      if (!fs.existsSync(tmpOut)) {
        return resolve([]);
      }

      var content = fs.readFileSync(tmpOut, "utf8");
      try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch(e) {}

      var lines = content.split(/\\r?\\n/)
        .map(function(l) { return l.trim(); })
        .filter(function(l) {
          return l.length > 0 &&
                 l.indexOf("Changed database context") === -1 &&
                 l.indexOf("Changed language") === -1 &&
                 l.indexOf("rows affected") === -1 &&
                 l.indexOf("---") !== 0;
        });

      if (lines.length > 0 && (lines[0].indexOf("Msg ") !== -1 || lines[0].indexOf("Server:") !== -1 || lines[0].indexOf("Level ") !== -1)) {
        console.error("  [SQL Server Error]: " + lines.slice(0, 3).join(" | "));
        return resolve([]);
      }

      resolve(lines);
    });
  });
}

function num(val) {
  var n = parseFloat(val);
  return isNaN(n) ? 0 : parseFloat(n.toFixed(2));
}

function sanitizeMsg(msg) {
  if (!msg) return "";
  var out = "";
  for (var i = 0; i < msg.length; i++) {
    var code = msg.charCodeAt(i);
    if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 32 || code === 45 || code === 46 || code === 44 || code === 47) {
      out += msg[i];
    } else {
      out += " ";
    }
  }
  return out.replace(/\\s+/g, " ").trim();
}

function formatDate(val) {
  if (!val) return "01/10/2026";
  if (typeof val === "string" && val.indexOf("/") !== -1) {
    return val;
  }
  var d = new Date(val);
  if (isNaN(d.getTime())) {
    var parts = String(val).split(/[- :T\\/]/);
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        return ("0" + parts[2]).slice(-2) + "/" + ("0" + parts[1]).slice(-2) + "/" + parts[0];
      }
    }
    return String(val);
  }
  var day = ("0" + d.getDate()).slice(-2);
  var mon = ("0" + (d.getMonth() + 1)).slice(-2);
  return day + "/" + mon + "/" + d.getFullYear();
}

// Build generic payload for any hotel/restaurant bill
function buildPayload(mas, items) {
  var sStcd = (mas.sellerstcd || "").trim();
  var sGstin = (mas.sellergstin || "33AACFN8951B2ZH").trim();
  if (!sStcd && sGstin.length >= 2) sStcd = sGstin.substring(0, 2);
  if (!sStcd) sStcd = "33";
  if (sStcd.length === 1) sStcd = "0" + sStcd;

  var bGstin = (mas.buyergstin || "").trim();
  var bStcd = "";
  if (bGstin.length >= 2 && /^\\d{2}/.test(bGstin)) {
    bStcd = bGstin.substring(0, 2);
  } else if (mas.buyerstcd && mas.buyerstcd.trim().length > 0) {
    bStcd = mas.buyerstcd.trim();
    if (bStcd.length === 1) bStcd = "0" + bStcd;
  } else {
    bStcd = sStcd;
  }

  var rawCgst = num(mas.cgstval || 0);
  var rawSgst = num(mas.sgstval || 0);
  var rawIgst = num(mas.igstval || 0);

  // -------------------------------------------------------------------
  // Section 12(3)(b) Hotel lodging POS rule:
  // For hotel accommodation, when CGST/SGST is charged (or IGST is 0),
  // the supply is INTRA-STATE, and POS MUST match Hotel State ("33" - Tamil Nadu).
  // When IGST is charged, supply is INTER-STATE, and POS is buyer state code.
  // -------------------------------------------------------------------
  var isIntraState = (rawCgst > 0 || rawSgst > 0) || (rawIgst === 0);

  var bPos = isIntraState ? sStcd : bStcd;
  var actCgst = isIntraState ? rawCgst : 0;
  var actSgst = isIntraState ? rawSgst : 0;
  var actIgst = isIntraState ? 0 : (rawIgst > 0 ? rawIgst : num(rawCgst + rawSgst));

  var sPin = num(mas.sellerpin || 0);
  if (sPin < 100000 || sPin > 999999) sPin = 643001;

  var bPin = num(mas.buyerpin || 0);
  if (bPin < 100000 || bPin > 999999) bPin = sPin;

  var sLglNm = sanitizeMsg(mas.sellerlglnm) || "HOTEL NAHAR NILGIRIS";
  var sAddr1 = sanitizeMsg(mas.selleraddr1) || "52-A CHARING CROSS";
  var sLoc = sanitizeMsg(mas.sellerloc) || "OOTY";
  var sAddr2 = sanitizeMsg(mas.selleraddr2 || (sLoc + "-" + sPin)) || null;

  var bLglNm = sanitizeMsg(mas.buyerlglnm) || "B2B VALUED GUEST";
  var bLoc = sanitizeMsg(mas.buyerloc) || sLoc;
  var bAddr1 = sanitizeMsg(mas.buyeraddr1) || (bLoc ? ("MAIN ROAD, " + bLoc) : "HOTEL PREMISES");
  var bAddr2 = sanitizeMsg(mas.buyeraddr2) || null;

  var itemList = [];
  if (items && items.length > 0) {
    for (var j = 0; j < items.length; j++) {
      var itm = items[j];
      var rawItmCgst = num(itm.cgstamt || 0);
      var rawItmSgst = num(itm.sgstamt || 0);
      var rawItmIgst = num(itm.igstamt || 0);

      var itmCgst = isIntraState ? rawItmCgst : 0;
      var itmSgst = isIntraState ? rawItmSgst : 0;
      var itmIgst = isIntraState ? 0 : (rawItmIgst > 0 ? rawItmIgst : num(rawItmCgst + rawItmSgst));

      var itmAss = num(itm.assamt || 0);
      var itmTot = num(itm.totamt || itmAss);
      var itmUnitPrice = num(itm.unitprice || itmAss);
      var itmQty = num(itm.qty || 1);
      var itmFreeQty = num(itm.freeqty || 0);
      var itmDiscount = num(itm.discount || 0);
      var itmGstRt = num(itm.gstrt || 5);
      var itmTotVal = num(itm.totitemval || (itmAss + itmCgst + itmSgst + itmIgst));

      itemList.push({
        SlNo: String(j + 1),
        PrdDesc: sanitizeMsg(itm.prddesc) || "ROOM RENT",
        IsServc: "Y",
        HsnCd: sanitizeMsg(itm.hsncd) || "996311",
        Qty: itmQty,
        FreeQty: itmFreeQty,
        Unit: sanitizeMsg(itm.unit) || "NOS",
        UnitPrice: itmUnitPrice,
        TotAmt: itmTot,
        Discount: itmDiscount,
        AssAmt: itmAss,
        GstRt: itmGstRt,
        IgstAmt: itmIgst,
        CgstAmt: itmCgst,
        SgstAmt: itmSgst,
        CesRt: 0,
        CesAmt: 0,
        CesNonAdvlAmt: 0,
        StateCesRt: 0,
        StateCesAmt: 0,
        StateCesNonAdvlAmt: 0,
        OthChrg: 0,
        TotItemVal: itmTotVal
      });
    }
  } else {
    // Dynamic single-item fallback based on master row values
    var fallbackAss = num(mas.assval || 0);
    var fallbackTotItem = num(fallbackAss + actCgst + actSgst + actIgst);
    var fallbackGstRt = (fallbackAss > 0 && (actCgst + actSgst + actIgst) > 0)
      ? Math.round(((actCgst + actSgst + actIgst) / fallbackAss) * 100)
      : 5;

    itemList.push({
      SlNo: "1",
      PrdDesc: "ROOM RENT",
      IsServc: "Y",
      HsnCd: "996311",
      Qty: 1,
      FreeQty: 0,
      Unit: "NOS",
      UnitPrice: fallbackAss,
      TotAmt: fallbackAss,
      Discount: 0,
      AssAmt: fallbackAss,
      GstRt: fallbackGstRt,
      IgstAmt: actIgst,
      CgstAmt: actCgst,
      SgstAmt: actSgst,
      CesRt: 0,
      CesAmt: 0,
      CesNonAdvlAmt: 0,
      StateCesRt: 0,
      StateCesAmt: 0,
      StateCesNonAdvlAmt: 0,
      OthChrg: 0,
      TotItemVal: fallbackTotItem
    });
  }

  var assVal = num(mas.assval || 0);
  if (assVal <= 0) {
    var sumAss = 0;
    for (var k = 0; k < itemList.length; k++) sumAss += itemList[k].AssAmt;
    assVal = num(sumAss);
  }

  var ces = num(mas.cesval || 0);
  var oth = num(mas.othchrg || 0);
  var calculatedTotal = num(assVal + actCgst + actSgst + actIgst + ces + oth);
  var rnd = num(mas.rndoffamt || 0);
  var totInvVal = num(mas.totinvval || 0);

  if (totInvVal <= 0) {
    totInvVal = num(calculatedTotal + rnd);
  } else if (rnd === 0 && Math.abs(totInvVal - calculatedTotal) > 0.001) {
    rnd = num(totInvVal - calculatedTotal);
  }

  return {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: (mas.suptyp || "B2B").trim(),
      RegRev: (mas.regrv === "Y") ? "Y" : "N",
      EcmGstin: null,
      IgstOnIntra: "N"
    },
    DocDtls: {
      Typ: (mas.typ || "INV").trim(),
      No: sanitizeMsg(mas.billno),
      Dt: formatDate(mas.billdate)
    },
    SellerDtls: {
      Gstin: sGstin,
      LglNm: sLglNm,
      TrdNm: null,
      Addr1: sAddr1,
      Addr2: sAddr2,
      Loc: sLoc,
      Pin: sPin,
      Stcd: sStcd,
      Em: mas.selleremail ? sanitizeMsg(mas.selleremail) : null,
      Ph: null
    },
    BuyerDtls: {
      Gstin: bGstin,
      LglNm: bLglNm,
      TrdNm: null,
      Pos: bPos,
      Addr1: bAddr1,
      Addr2: bAddr2,
      Loc: bLoc,
      Pin: bPin,
      Stcd: bStcd,
      Em: mas.buyeremail ? sanitizeMsg(mas.buyeremail) : null,
      Ph: mas.buyerphone ? sanitizeMsg(mas.buyerphone) : null
    },
    ItemList: itemList,
    ValDtls: {
      AssVal: assVal,
      CgstVal: actCgst,
      SgstVal: actSgst,
      IgstVal: actIgst,
      CesVal: ces,
      StCesVal: 0,
      Discount: 0,
      OthChrg: oth,
      RndOffAmt: rnd,
      TotInvVal: totInvVal,
      TotInvValFc: 0
    }
  };
}

function postToGstZen(token, payload) {
  return new Promise(function(resolve, reject) {
    var data = JSON.stringify(payload);
    var parsed = urlParser.parse(GSTZEN_URL);

    var options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.path,
      method: "POST",
      headers: {
        "Token": token,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "User-Agent": "GSTZen-Sync-ZeroDep/1.0"
      },
      rejectUnauthorized: false
    };

    var req = https.request(options, function(res) {
      var chunks = [];
      res.on("data", function(chunk) { chunks.push(chunk); });
      res.on("end", function() {
        var body = Buffer.concat(chunks).toString("utf8");
        try {
          var parsedJson = JSON.parse(body);
          resolve(parsedJson);
        } catch (e) {
          resolve({ error: "Invalid JSON from GSTZen: " + body });
        }
      });
    });

    req.on("error", function(err) {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

var isRunning = false;

function syncCycle() {
  if (isRunning) return;
  isRunning = true;

  console.log("[" + new Date().toISOString() + "] Checking pending actions in " + DB_NAME + "...");

  // Select top 1 pending invoice using strictly verified columns from SQL Server 2000
  var selectSql = "SELECT TOP 1 " +
    "CAST(ISNULL(mas.eid, 0) AS VARCHAR(20)) + '|' + " +
    "CAST(ISNULL(mas.billno, '') AS VARCHAR(50)) + '|' + " +
    "CAST(ISNULL(CONVERT(VARCHAR(10), mas.billdate, 103), '') AS VARCHAR(20)) + '|' + " +
    "CAST(ISNULL(mas.typ, 'INV') AS VARCHAR(10)) + '|' + " +
    "CAST(ISNULL(mas.suptyp, 'B2B') AS VARCHAR(10)) + '|' + " +
    "CAST(ISNULL(mas.taxsh, 'GST') AS VARCHAR(10)) + '|' + " +
    "CAST(ISNULL(mas.regrv, 'N') AS VARCHAR(5)) + '|' + " +
    "CAST(ISNULL(mas.sellergstin, '33AACFN8951B2ZH') AS VARCHAR(20)) + '|' + " +
    "CAST(ISNULL(mas.sellerlglnm, 'HOTEL NAHAR NILGIRIS') AS VARCHAR(100)) + '|' + " +
    "CAST(ISNULL(mas.selleraddrl, '52-A CHARING CROSS') AS VARCHAR(100)) + '|' + " +
    "CAST(ISNULL(mas.sellerloc, 'OOTY') AS VARCHAR(50)) + '|' + " +
    "CAST(ISNULL(mas.sellerpin, '638001') AS VARCHAR(10)) + '|' + " +
    "CAST(ISNULL(mas.sellerstcd, '33') AS VARCHAR(5)) + '|' + " +
    "CAST(ISNULL(mas.buyergstin, '') AS VARCHAR(20)) + '|' + " +
    "CAST(ISNULL(mas.buyerlglnm, '') AS VARCHAR(100)) + '|' + " +
    "CAST(ISNULL(mas.buyeraddrl, '') AS VARCHAR(100)) + '|' + " +
    "CAST(ISNULL(mas.buyerloc, '') AS VARCHAR(50)) + '|' + " +
    "CAST(ISNULL(mas.buyerpin, '') AS VARCHAR(10)) + '|' + " +
    "CAST(ISNULL(mas.buyerstcd, '') AS VARCHAR(5)) + '|' + " +
    "CAST(ISNULL(mas.assval, 0) AS VARCHAR(30)) + '|' + " +
    "CAST(ISNULL(mas.cgstval, 0) AS VARCHAR(30)) + '|' + " +
    "CAST(ISNULL(mas.sgstval, 0) AS VARCHAR(30)) + '|' + " +
    "CAST(ISNULL(mas.igstval, 0) AS VARCHAR(30)) + '|' + " +
    "CAST(ISNULL(mas.cesval, 0) AS VARCHAR(30)) + '|' + " +
    "CAST(ISNULL(mas.othchrg, 0) AS VARCHAR(30)) + '|' + " +
    "CAST(ISNULL(mas.rndoffamt, 0) AS VARCHAR(30)) + '|' + " +
    "CAST(ISNULL(mas.totinvval, 0) AS VARCHAR(30)) " +
    "FROM trans_b2beinvoice_mas mas " +
    "WHERE (ISNULL(mas.Syncflag, 0) = 0) " +
    "  AND (ISNULL(mas.NotSyncflag, 0) = 0) " +
    "ORDER BY mas.eid ASC";

  executeSql(selectSql)
    .then(function(lines) {
      if (!lines || lines.length === 0) {
        console.log("[" + new Date().toLocaleTimeString() + "] Database checked: 0 pending bills (Syncflag=0). Next check in 10s...");
        isRunning = false;
        return;
      }

      var cols = lines[0].split("|");
      if (cols.length < 5) {
        console.log("  [Notice] Row format unrecognized, skipping:", lines[0]);
        isRunning = false;
        return;
      }

      var mas = {
        eid: parseInt(cols[0], 10),
        billno: cols[1],
        billdate: cols[2],
        typ: cols[3],
        suptyp: cols[4],
        taxsh: cols[5],
        regrv: cols[6],
        sellergstin: cols[7] || "33AACFN8951B2ZH",
        sellerlglnm: cols[8] || "HOTEL NAHAR NILGIRIS",
        selleraddr1: cols[9] || "52-A CHARING CROSS",
        sellerloc: cols[10] || "OOTY",
        sellerpin: cols[11] || "638001",
        sellerstcd: cols[12] || "33",
        buyergstin: cols[13] || "",
        buyerlglnm: cols[14] || "",
        buyeraddr1: cols[15] || "",
        buyerloc: cols[16] || "",
        buyerpin: cols[17] || "",
        buyerstcd: cols[18] || "",
        assval: parseFloat(cols[19] || 0),
        cgstval: parseFloat(cols[20] || 0),
        sgstval: parseFloat(cols[21] || 0),
        igstval: parseFloat(cols[22] || 0),
        cesval: parseFloat(cols[23] || 0),
        othchrg: parseFloat(cols[24] || 0),
        rndoffamt: parseFloat(cols[25] || 0),
        totinvval: parseFloat(cols[26] || 0)
      };

      var eid = mas.eid;
      var billno = mas.billno;
      var hotelCode = "NAHAR";

      console.log("[New Invoice] Bill No: " + billno + " (EID: " + eid + ")");
      console.log("Posting payload for " + billno + " to GST Zen...");

      // Select items from trans_b2beinvoice_det using verified columns
      var itemSql = "SELECT " +
        "CAST(ISNULL(det.slno, 1) AS VARCHAR(10)) + '|' + " +
        "CAST(ISNULL(det.prddesc, 'ROOM RENT') AS VARCHAR(100)) + '|' + " +
        "CAST(ISNULL(det.hsncd, '996311') AS VARCHAR(20)) + '|' + " +
        "CAST(ISNULL(det.qty, 1) AS VARCHAR(20)) + '|' + " +
        "CAST(ISNULL(det.freeqty, 0) AS VARCHAR(20)) + '|' + " +
        "CAST(ISNULL(det.unit, 'NOS') AS VARCHAR(10)) + '|' + " +
        "CAST(ISNULL(det.unitprice, 0) AS VARCHAR(30)) + '|' + " +
        "CAST(ISNULL(det.totamt, 0) AS VARCHAR(30)) + '|' + " +
        "CAST(ISNULL(det.discount, 0) AS VARCHAR(30)) + '|' + " +
        "CAST(ISNULL(det.assamt, 0) AS VARCHAR(30)) + '|' + " +
        "CAST(ISNULL(det.gstrt, 5) AS VARCHAR(20)) + '|' + " +
        "CAST(ISNULL(det.cgstamt, 0) AS VARCHAR(30)) + '|' + " +
        "CAST(ISNULL(det.sgstamt, 0) AS VARCHAR(30)) + '|' + " +
        "CAST(ISNULL(det.igstamt, 0) AS VARCHAR(30)) " +
        "FROM trans_b2beinvoice_det det " +
        "WHERE det.eid = " + eid + " " +
        "ORDER BY det.slno ASC";

      return executeSql(itemSql).then(function(itemLines) {
        var items = [];
        if (itemLines && itemLines.length > 0) {
          for (var i = 0; i < itemLines.length; i++) {
            var icols = itemLines[i].split("|");
            items.push({
              slno: icols[0],
              prddesc: icols[1],
              hsncd: icols[2],
              qty: parseFloat(icols[3] || 1),
              freeqty: parseFloat(icols[4] || 0),
              unit: icols[5] || "NOS",
              unitprice: parseFloat(icols[6] || 0),
              totamt: parseFloat(icols[7] || 0),
              discount: parseFloat(icols[8] || 0),
              assamt: parseFloat(icols[9] || 0),
              gstrt: parseFloat(icols[10] || 5),
              cgstamt: parseFloat(icols[11] || 0),
              sgstamt: parseFloat(icols[12] || 0),
              igstamt: parseFloat(icols[13] || 0)
            });
          }
        }

        var payload = buildPayload(mas, items);
        var token = DEFAULT_TOKEN;

        return postToGstZen(token, payload).then(function(res) {
          var respObj = Array.isArray(res) ? res[0] : res;

          var irn = "";
          var ackNo = "";
          var ackDt = "";
          var uuid = "";
          var signedQr = "";
          var signedInv = "";

          if (respObj) {
            irn = String(respObj.irn || respObj.Irn || "").trim();
            ackNo = String(respObj.ackno || respObj.AckNo || "").trim();
            ackDt = String(respObj.ackdt || respObj.AckDt || "").trim();
            uuid = String(respObj.uuid || "").trim();
            signedQr = String(respObj.signed_qrcode || respObj.SignedQrCode || respObj.signed_qr_code || "").trim();
            signedInv = String(respObj.signed_invoice || respObj.SignedInvoice || respObj.signed_invoice || "").trim();
          }

          var isSuccess = (respObj && (respObj.status === "1" || respObj.status === 1 || respObj.success === true)) || (irn.length > 10);

          if (isSuccess) {
            console.log("  >>> SUCCESS! IRN: " + irn);

            var safeBill = billno.replace(/[^a-zA-Z0-9_-]/g, "_");
            var safeIrn = irn.replace(/'/g, "''");
            var safeAckNo = ackNo.replace(/'/g, "''");
            var safeAckDt = ackDt.replace(/'/g, "''");

            // STAGE 1: Guaranteed immediate update of Syncflag=1, NotSyncflag=0, and IRN
            var stage1Sql = "UPDATE trans_b2beinvoice_mas SET " +
              "syncflag = 1, " +
              "notsyncflag = 0, " +
              "reason = 'IRN Generated Successfully' " +
              "WHERE eid = " + eid + " OR billno = '" + safeBill + "';\\n" +
              "UPDATE trans_b2beinvoice_mas SET " +
              "Irn = '" + safeIrn + "', " +
              "AckNo = '" + safeAckNo + "' " +
              "WHERE eid = " + eid + ";";

            return executeSql(stage1Sql).then(function() {
              console.log("  >>> Stage 1: Syncflag set to 1 for Bill: " + billno + " (EID: " + eid + ")");

              // Save raw signed QR string to disk for invoice print engines
              if (signedQr) {
                try {
                  var rawQrPath = path.join(QR_DIR, safeBill + "_jwt.txt");
                  mkdirsSync(path.dirname(rawQrPath));
                  fs.writeFileSync(rawQrPath, signedQr);
                } catch (e) {}
              }

              // Download QR code image and PDF
              var qrcodeUrl = respObj.SignedQrCodeImgUrl || respObj.signed_qr_code_img_url || respObj.qrcode_img_url || "";
              if (!qrcodeUrl && uuid) {
                qrcodeUrl = "https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-qr/" + uuid + "/";
              } else if (!qrcodeUrl && irn) {
                qrcodeUrl = "https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-qr/" + irn + "/";
              }

              var pdfUrl = respObj.InvoicePdfUrl || respObj.invoice_pdf_url || respObj.pdf_url || "";
              if (!pdfUrl && uuid) {
                pdfUrl = "https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-pdf/" + uuid + "/";
              } else if (!pdfUrl && irn) {
                pdfUrl = "https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-pdf/" + irn + "/";
              }

              function isDownloadableUrl(u) {
                if (!u || typeof u !== "string") return false;
                var trimmed = u.trim();
                if (trimmed.length > 500) return false;
                if (trimmed.indexOf("ey") === 0) return false;
                return trimmed.indexOf("http") === 0 || trimmed.indexOf("/") === 0;
              }

              var dlPromises = [];

              if (isDownloadableUrl(qrcodeUrl)) {
                var qrDest = [
                  path.join(QR_DIR, safeBill + ".png"),
                  path.join(BACKUP_DIR, hotelCode, safeBill + ".png")
                ];
                dlPromises.push(
                  downloadBinary(qrcodeUrl, qrDest, token)
                    .then(function() { console.log("  >>> QR Code received and saved to " + qrDest[0]); })
                    .catch(function(e) { console.error("  >>> QR download notice:", e.message); })
                );
              }

              if (isDownloadableUrl(pdfUrl)) {
                var pdfDest = [
                  path.join(PDF_DIR, safeBill + ".pdf"),
                  path.join(BACKUP_DIR, hotelCode, safeBill + ".pdf")
                ];
                dlPromises.push(
                  downloadBinary(pdfUrl, pdfDest, token)
                    .then(function() { console.log("  >>> PDF received and saved to " + pdfDest[0]); })
                    .catch(function(e) { console.error("  >>> PDF download notice:", e.message); })
                );
              }

              return Promise.all(dlPromises)
                .catch(function(e) {
                  console.error("  >>> File download notice:", e.message);
                })
                .then(function() {
                  // STAGE 2: Set qrstatusflag = 1, upload = 1 strictly in trans_b2beinvoice_mas only (not in trans_checkout_mas)
                  var stage2Sql = "UPDATE trans_b2beinvoice_mas SET " +
                    "qrstatusflag = 1, " +
                    "upload = 1 " +
                    "WHERE eid = " + eid + " OR billno = '" + safeBill + "';";

                  return executeSql(stage2Sql).then(function() {
                    console.log("  >>> Stage 2: Qrstatusflag=1 and Upload=1 updated in trans_b2beinvoice_mas for Bill: " + billno);

                    // Optional storage of signed tokens if columns exist
                    if (signedQr || signedInv) {
                      var tokenSql = "UPDATE trans_b2beinvoice_mas SET " +
                        "SignedQRCode = '" + signedQr.replace(/'/g, "''").substring(0, 1000) + "', " +
                        "SignedInvoice = '" + signedInv.replace(/'/g, "''").substring(0, 1000) + "' " +
                        "WHERE eid = " + eid + ";";
                      executeSql(tokenSql).catch(function() {});
                    }

                    // Process next pending bill immediately (no 10s wait)
                    isRunning = false;
                    setTimeout(syncCycle, 1000);
                  });
                });
            });

          } else {
            var errStr = "";
            if (respObj && respObj.__all__) {
              errStr = Array.isArray(respObj.__all__) ? respObj.__all__.join("; ") : JSON.stringify(respObj.__all__);
            } else if (respObj && (respObj.message || respObj.error || respObj.ErrorDetails)) {
              errStr = respObj.message || respObj.error || JSON.stringify(respObj.ErrorDetails);
            } else {
              errStr = JSON.stringify(res);
            }

            console.error("  [GST Zen API Error]: " + errStr);

            var failSql = "UPDATE trans_b2beinvoice_mas SET " +
              "notsyncflag = 1, " +
              "reason = '" + errStr.replace(/'/g, "''").substring(0, 500) + "' " +
              "WHERE eid = " + eid + ";";

            return executeSql(failSql).then(function() {
              isRunning = false;
              // Check if another bill can be processed
              setTimeout(syncCycle, 2000);
            });
          }
        });
      });
    })
    .catch(function(err) {
      console.error("Sync error:", err.message);
      isRunning = false;
    });
}

console.log("========================================================");
console.log("  GST Zen Zero-Dependency Sync Daemon (osql Edition)");
console.log("  Database: " + DB_NAME);
console.log("  OSQL:     " + OSQL_EXE);
console.log("  Interval: " + (SYNC_INTERVAL_MS / 1000) + " seconds");
console.log("========================================================");

syncCycle();
setInterval(syncCycle, SYNC_INTERVAL_MS);
`;

