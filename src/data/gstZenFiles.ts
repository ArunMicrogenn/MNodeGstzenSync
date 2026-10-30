// CodeIgniter database configuration provided for GST Zen / E-Invoice Sync
export const databasePhpContent = `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
| -------------------------------------------------------------------
| DATABASE CONNECTIVITY SETTINGS
| -------------------------------------------------------------------
| This file will contain the settings needed to access your database.
|
| For complete instructions please consult the 'Database Connection'
| page of the User Guide.
|
| -------------------------------------------------------------------
| EXPLANATION OF VARIABLES
| -------------------------------------------------------------------
|
|	['dsn']      The full DSN string describe a connection to the database.
|	['hostname'] The hostname of your database server.
|	['username'] The username used to connect to the database
|	['password'] The password used to connect to the database
|	['database'] The name of the database you want to connect to
|	['dbdriver'] The database driver. e.g.: mysqli.
|			Currently supported:
|				 cubrid, ibase, mssql, mysql, mysqli, oci8,
|				 odbc, pdo, postgre, sqlite, sqlite3, sqlsrv
|	['dbprefix'] You can add an optional prefix, which will be added
|				 to the table name when using the  Query Builder class
|	['pconnect'] TRUE/FALSE - Whether to use a persistent connection
|	['db_debug'] TRUE/FALSE - Whether database errors should be displayed.
|	['cache_on'] TRUE/FALSE - Enables/disables query caching
|	['cachedir'] The path to the folder where cache files should be stored
|	['char_set'] The character set used in communicating with the database
|	['dbcollat'] The character collation used in communicating with the database
|				 NOTE: For MySQL and MySQLi databases, this setting is only used
| 				 as a backup if your server is running PHP < 5.2.3 or MySQL < 5.0.7
|				 (and in table creation queries made with DB Forge).
| 				 There is an incompatibility in PHP with mysql_real_escape_string() which
| 				 can make your site vulnerable to SQL injection if you are using a
| 				 multi-byte character set and are running versions lower than these.
| 				 Sites using Latin-1 or UTF-8 database character set and collation are unaffected.
|	['swap_pre'] A default table prefix that should be swapped with the dbprefix
|	['encrypt']  Whether or not to use an encrypted connection.
|
|			'mysql' (deprecated), 'sqlsrv' and 'pdo/sqlsrv' drivers accept TRUE/FALSE
|			'mysqli' and 'pdo/mysql' drivers accept an array with the following options:
|
|				'ssl_key'    - Path to the private key file
|				'ssl_cert'   - Path to the public key certificate file
|				'ssl_ca'     - Path to the certificate authority file
|				'ssl_capath' - Path to a directory containing trusted CA certificats in PEM format
|				'ssl_cipher' - List of *allowed* ciphers to be used for the encryption, separated by colons (':')
|				'ssl_verify' - TRUE/FALSE; Whether verify the server certificate or not ('mysqli' only)
|
|	['compress'] Whether or not to use client compression (MySQL only)
|	['stricton'] TRUE/FALSE - forces 'Strict Mode' connections
|							- good for ensuring strict SQL while developing
|	['ssl_options']	Used to set various SSL options that can be used when making SSL connections.
|	['failover'] array - A array with 0 or more data for connections if the main should fail.
|	['save_queries'] TRUE/FALSE - Whether to "save" all executed queries.
| 				NOTE: Disabling this will also effectively disable both
| 				$this->db->last_query() and profiling of DB queries.
| 				When you run a query, with this setting set to TRUE (default),
| 				CodeIgniter will store the SQL statement for debugging purposes.
| 				However, this may cause high memory usage, especially if you run
| 				a lot of SQL queries ... disable this to avoid that problem.
|
| The $active_group variable lets you choose which connection group to
| make active.  By default there is only one group (the 'default' group).
|
| The $query_builder variables lets you determine whether or not to load
| the query builder class.
*/
$active_group = 'default';
$query_builder = TRUE;

/*
| ===================================================================
| SQL SERVER 2000 CONFIGURATION (Windows Server 2003 R2 / Legacy MDAC)
| ===================================================================
| For SQL Server 2000, DO NOT use 'SQL Server Native Client 11.0'
| (Native Client 11 is for SQL Server 2012+ and fails on SQL 2000).
|
| Use the built-in Windows MDAC driver: DRIVER={SQL Server}
| or PHP's native 'mssql' driver (php_mssql.dll / ntwdblib.dll).
*/

// Primary: Built-in Windows ODBC Driver for SQL Server 2000
$db['default'] = array(
	'dsn'	=> '',
	'hostname' => 'DRIVER={SQL Server};Server=164.52.195.176\\\\sqlexpress;Database=EInvoicenew;',
	'username' => 'sa',
	'password' => 'Mgenn@123',
	'database' => 'EInvoicenew',
	'dbdriver' => 'odbc',
	'dbprefix' => '',
	'pconnect' => FALSE,
	'db_debug' => TRUE,
	'cache_on' => FALSE,
	'cachedir' => '',
	'char_set' => 'utf8',
	'dbcollat' => 'utf8_general_ci',
	'swap_pre' => '',
	'encrypt' => FALSE,
	'compress' => FALSE,
	'stricton' => FALSE,
	'failover' => array(),
	'save_queries' => TRUE
);

/*
| Alternative for PHP 5.2 / 5.3 / 5.4 with native php_mssql.dll:
| $db['default'] = array(
| 	'hostname' => '164.52.195.176\\\\sqlexpress', // or 'localhost' or '127.0.0.1,1433'
| 	'username' => 'sa',
| 	'password' => 'Mgenn@123',
| 	'database' => 'EInvoicenew',
| 	'dbdriver' => 'mssql',
| 	'pconnect' => FALSE,
| 	'db_debug' => TRUE
| );
*/
`;

// CodeIgniter Sync Controller with Automatic POS & Intra-State Tax Balancing
export const syncPhpContent = `<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Sync extends CI_Controller {
	public function index()
	{
		header("Refresh:10");	
		echo "Refreshing...";
		$date = date("Y/m/d");
		echo $time = date("h:i:s");

		// =========================================================================
		// SECTION 1: Standard B2B E-Invoices
		// =========================================================================
		$sql1 = "select * from trans_b2beinvoice_mas where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=0";
		$exe1 = $this->db->query($sql1);
		$no = $exe1->num_rows();
		if ($no > 0)
		{				
			$sql = "select top 1 isnull(CgstVal,0) as CgstVal, isnull(cesval,0) as CesVal, isnull(othchrg,0) as OthChrg, * from trans_b2beinvoice_mas mas						
					Inner join Mas_Hotel h on h.HotelCode = mas.ehotelcode
					where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=0";
			$exe = $this->db->query($sql);
			foreach ($exe->result_array() as $row)
			{ 
				$buyeremail = !empty($row['buyeremail']) ? $row['buyeremail'] : '';
				$selleremail = !empty($row['selleremail']) ? $row['selleremail'] : '';

				$legalName = $row['buyerlglnm'] ?? '';
				if (!empty($legalName)) {
					$encoding = mb_detect_encoding($legalName, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
					$legalNames = mb_convert_encoding($legalName, 'UTF-8', $encoding ?: 'ISO-8859-1');
				} else {
					$legalNames = '';
				}

				$addr1 = preg_replace('/[^a-zA-Z0-9\s,.-]/', '', $row['buyeraddrl'] ?? '');
				$addr2 = preg_replace('/[^a-zA-Z0-9\s,.-]/', '', $row['buyeradd2'] ?? '');

				// -------------------------------------------------------------
				// CRITICAL GST ZEN FIX: Place of Supply & CGST/SGST Validation
				// Under GST Act Sec 12(3)(b) (Immovable Property / Hotel Stay):
				// If CGST or SGST is charged, POS MUST match Seller State Code (e.g. '33')
				// If POS != Seller State Code, GST Zen / NIC throws:
				// "{__all__ [CGST details should not be present, SGST details should not be present]}"
				// -------------------------------------------------------------
				$rawCgst = floatval($row['CgstVal'] ?? 0);
				$rawSgst = floatval($row['sgstval'] ?? 0);
				$rawIgst = floatval($row['igstval'] ?? 0);

				$isIntraState = ($rawCgst > 0 || $rawSgst > 0) || ($rawIgst == 0);

				if ($isIntraState) {
					$pos = !empty($row['sellerstcd']) ? str_pad($row['sellerstcd'], 2, '0', STR_PAD_LEFT) : '33';
					$actCgst = number_format($rawCgst, 2, '.', '');
					$actSgst = number_format($rawSgst, 2, '.', '');
					$actIgst = '0.00';
				} else {
					$pos = !empty($row['buyerpos']) ? str_pad($row['buyerpos'], 2, '0', STR_PAD_LEFT) : (!empty($row['buyerstcd']) ? str_pad($row['buyerstcd'], 2, '0', STR_PAD_LEFT) : substr($row['buyergstin'], 0, 2));
					$actCgst = '0.00';
					$actSgst = '0.00';
					$actIgst = number_format($rawIgst > 0 ? $rawIgst : ($rawCgst + $rawSgst), 2, '.', '');
				}

				$mas = '"DocDtls": {
						"Dt": "'.date("d/m/Y", strtotime($row['billdate'])).'",
						"No": "'.$row['billno'].'",
						"Typ": "'.$row['typ'].'"
					},
					"ValDtls": {
						"AssVal": '.number_format($row['assval'], 2, '.', '').',
						"CesVal": '.number_format($row['CesVal'], 2, '.', '').',
						"CgstVal": '.$actCgst.',
						"IgstVal": '.$actIgst.',
						"OthChrg": '.number_format($row['OthChrg'], 2, '.', '').',
						"SgstVal": '.$actSgst.',
						"Discount": 0.00,
						"StCesVal": '.number_format($row['stcesval'] ?? 0, 2, '.', '').',
						"RndOffAmt": '.number_format($row['rndoffamt'] ?? 0, 2, '.', '').',
						"TotInvVal": '.number_format($row['Totinvval'], 2, '.', '').',
						"TotInvValFc": 0
					},					
					"TranDtls": {
						"RegRev": "'.(!empty($row['regrv']) ? $row['regrv'] : 'N').'",
						"SupTyp": "'.(!empty($row['suptyp']) ? $row['suptyp'] : 'B2B').'",
						"TaxSch": "'.(!empty($row['taxsh']) ? $row['taxsh'] : 'GST').'",
						"EcmGstin": null,
						"IgstOnIntra": "'.(!empty($row['igstonintra']) ? $row['igstonintra'] : 'N').'"
					},
					"SellerDtls": {
						"Em": "'.$selleremail.'",
						"Ph": "'.($row['sellerphone'] ?? '').'",
						"Loc": "'.($row['sellerloc'] ?? '').'",
						"Pin": '.intval($row['sellerpin'] ?? 641035).',
						"Stcd": "'.str_pad($row['sellerstcd'] ?? '33', 2, '0', STR_PAD_LEFT).'",
						"Addr1": "'.($row['selleraddrl'] ?? '').'",
						"Addr2": "'.($row['selleradd2'] ?? '').'",
						"Gstin": "'.($row['sellergstin'] ?? '').'",
						"LglNm": "'.($row['sellerlglnm'] ?? '').'"
					},
					"BuyerDtls": {
						"Em": "'.$buyeremail.'",
						"Ph": "'.($row['buyerphone'] ?? '').'",
						"Loc": "'.($row['buyerloc'] ?? '').'",
						"Pin": '.intval($row['buyerpin'] ?? 641001).',
						"Pos": "'.$pos.'",
						"Stcd": "'.str_pad($row['buyerstcd'] ?? (!empty($row['buyergstin']) ? substr($row['buyergstin'], 0, 2) : '33'), 2, '0', STR_PAD_LEFT).'",
						"Addr1": "'.$addr1.'",
						"Addr2": "'.$addr2.'",
						"Gstin": "'.($row['buyergstin'] ?? '').'",
						"LglNm": "'.$legalNames.'"
					}';			
			
				$ItemList = '';
				$sql2 = "select isnull(statecesnonadvlamt,0) as statecesnonadvlamt, qty, slno, unit, isnull(cesrt,0) as cesrt, gstrt, hsncd, assamt, isnull(cesamt,0) as cesamt, isnull(totamt,0) as totamt,
				cgstamt, freeqty, isnull(igstamt,0) as igstamt, isnull(othchrg,0) as othchrg, prddesc, isnull(sgstamt,0) as sgstamt, isnull(discount,0) as discount, isnull(pretaxval,0) as pretaxval, unitprice, isnull(statecesrt,0) as statecesrt, totitemval, isnull(statecesamt,0) as statecesamt,
				isnull(cesnonadvlamt,0) as cesnonadvlamt from trans_b2beinvoice_det where id='".$row['id']."' ";
				$exe2 = $this->db->query($sql2);
				$no2 = $exe2->num_rows();
				foreach ($exe2->result_array() as $row2)
				{	
					$no2 = $no2 - 1;							
					$itemCgstAmt = $isIntraState ? number_format($row2['cgstamt'], 2, '.', '') : '0.00';
					$itemSgstAmt = $isIntraState ? number_format($row2['sgstamt'], 2, '.', '') : '0.00';
					$itemIgstAmt = $isIntraState ? '0.00' : number_format(floatval($row2['igstamt']) > 0 ? $row2['igstamt'] : (floatval($row2['cgstamt']) + floatval($row2['sgstamt'])), 2, '.', '');

					$ItemList = $ItemList.'{
							"Qty": '.number_format($row2['qty'], 2, '.', '').',
							"SlNo": "'.$row2['slno'].'",
							"Unit": "'.(!empty($row2['unit']) ? $row2['unit'] : 'OTH').'",
							"CesRt": '.number_format($row2['cesrt'], 2, '.', '').',
							"GstRt": '.number_format($row2['gstrt'], 2, '.', '').',
							"HsnCd": "'.(!empty($row2['hsncd']) ? $row2['hsncd'] : '9963').'",
							"AssAmt": '.number_format($row2['assamt'], 2, '.', '').',
							"CesAmt": '.number_format($row2['cesamt'], 2, '.', '').',
							"TotAmt": '.number_format($row2['totamt'], 2, '.', '').',
							"CgstAmt": '.$itemCgstAmt.',
							"FreeQty": '.number_format($row2['freeqty'], 2, '.', '').',
							"IgstAmt": '.$itemIgstAmt.',
							"IsServc": "Y",
							"OthChrg": '.number_format($row2['othchrg'], 2, '.', '').',
							"PrdDesc": "'.substr(str_replace('"', '', $row2['prddesc']), 0, 100).'",
							"SgstAmt": '.$itemSgstAmt.',
							"Discount": '.number_format($row2['discount'], 2, '.', '').',
							"PreTaxVal": '.number_format($row2['pretaxval'], 2, '.', '').',
							"UnitPrice": '.number_format($row2['unitprice'], 2, '.', '').',
							"StateCesRt": '.number_format($row2['statecesrt'], 2, '.', '').',
							"TotItemVal": '.number_format($row2['totitemval'], 2, '.', '').',
							"StateCesAmt": '.number_format($row2['statecesamt'], 2, '.', '').',
							"CesNonAdvlAmt": '.number_format($row2['cesnonadvlamt'], 2, '.', '').',
							"StateCesNonAdvlAmt": '.number_format($row2['statecesnonadvlamt'], 2, '.', '').'
						}';
					if ($no2 > 0)
					{
						$ItemList = $ItemList.',';
					}						
				}

				$token = !empty($row['Zen_Token']) ? $row['Zen_Token'] : (!empty($row['Token']) ? $row['Token'] : '226e1ba9-a1ed-4249-9820-fa7a67cb1350');

				$curl = curl_init();
				curl_setopt_array($curl, array(
					CURLOPT_URL => 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/',
					CURLOPT_RETURNTRANSFER => true,
					CURLOPT_ENCODING => '',
					CURLOPT_MAXREDIRS => 10,
					CURLOPT_TIMEOUT => 45,
					CURLOPT_FOLLOWLOCATION => true,
					CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
					CURLOPT_CUSTOMREQUEST => 'POST',
					CURLOPT_POSTFIELDS => '{
						'.$mas.',										
						"Version": "1.1",
						"ItemList": ['.$ItemList.']								
					}',
					CURLOPT_HTTPHEADER => array(
						'Token: '.$token,
						'Content-Type: application/json'
					),
				));

				$response = curl_exec($curl);
				curl_close($curl);
				$result = json_decode($response, true);
				if (isset($result[0])) {
					$result = $result[0];
				}

				$rp = isset($result['status']) ? $result['status'] : (isset($result['success']) && $result['success'] ? '1' : '0');
				if ($rp == '1' || !empty($result['Irn']) || !empty($result['irn']))
				{
					$irn = !empty($result['Irn']) ? $result['Irn'] : (!empty($result['irn']) ? $result['irn'] : '');
					$ackDt = !empty($result['AckDt']) ? $result['AckDt'] : (!empty($result['ack_dt']) ? $result['ack_dt'] : '');
					$ackNo = !empty($result['AckNo']) ? $result['AckNo'] : (!empty($result['ack_no']) ? $result['ack_no'] : '');
					$signedQr = !empty($result['SignedQRCode']) ? $result['SignedQRCode'] : (!empty($result['signed_qr_code']) ? $result['signed_qr_code'] : '');
					$signedInv = !empty($result['SignedInvoice']) ? $result['SignedInvoice'] : (!empty($result['signed_invoice']) ? $result['signed_invoice'] : '');
					$uuid = !empty($result['uuid']) ? $result['uuid'] : '';
					$pdfUrl = !empty($result['InvoicePdfUrl']) ? $result['InvoicePdfUrl'] : (!empty($result['invoice_pdf_url']) ? $result['invoice_pdf_url'] : '');
					$qrUrl = !empty($result['SignedQrCodeImgUrl']) ? $result['SignedQrCodeImgUrl'] : (!empty($result['signed_qr_code_img_url']) ? $result['signed_qr_code_img_url'] : '');

					$ins = "insert into Response_ZenGst(Status,Message,Irn,AckDt,AckNo,SignedQRCode,SignedInvoice,uuid,SignedQrCodeImgUrl,InvoicePdfUrl,InsertDate,ehotelcode,Billno) 
							values('1','Success','".$irn."','".$ackDt."','".$ackNo."'
							,'".$signedQr."','".$signedInv."','".$uuid."','".$qrUrl."','".$pdfUrl."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."')";
					$this->db->query($ins);

					// Save PDF and QR Code files locally
					if (!empty($pdfUrl) || !empty($uuid)) {
						$targetPdfUrl = !empty($pdfUrl) ? (strpos($pdfUrl, 'http') === 0 ? $pdfUrl : 'https://my.gstzen.in'.$pdfUrl) : 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-pdf/'.$uuid.'/';
						$destDir = 'D:/microgennbackup/microgenn/Exe/exe/Html';
						if (!file_exists($destDir)) { @mkdir($destDir, 0777, true); }
						@file_put_contents($destDir.'/'.$row['billno'].'.pdf', @file_get_contents($targetPdfUrl));

						$backupDir = 'D:/SignedQrCode/'.$row['ehotelcode'];
						if (!file_exists($backupDir)) { @mkdir($backupDir, 0777, true); }
						@file_put_contents($backupDir.'/'.$row['billno'].'.pdf', @file_get_contents($targetPdfUrl));
					}

					if (!empty($qrUrl) || !empty($uuid)) {
						$targetQrUrl = !empty($qrUrl) ? (strpos($qrUrl, 'http') === 0 ? $qrUrl : 'https://my.gstzen.in'.$qrUrl) : 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-qr/'.$uuid.'/';
						$destQrDir = 'D:/microgennbackup/microgenn/Exe/exe/Mail/Qrcode';
						if (!file_exists($destQrDir)) { @mkdir($destQrDir, 0777, true); }
						@file_put_contents($destQrDir.'/'.$row['billno'].'.png', @file_get_contents($targetQrUrl));

						$backupDir = 'D:/SignedQrCode/'.$row['ehotelcode'];
						if (!file_exists($backupDir)) { @mkdir($backupDir, 0777, true); }
						@file_put_contents($backupDir.'/'.$row['billno'].'.png', @file_get_contents($targetQrUrl));
					}

					$update = "Update trans_b2beinvoice_mas set Syncflag=1, NotSyncflag=0, Irn='".$irn."', AckNo='".$ackNo."', AckDt='".$ackDt."', SignedQRCode='".$signedQr."', SignedInvoice='".$signedInv."', qrstatusflag=1, upload=1 where eid='".$row['eid']."'";
					$this->db->query($update);
					echo " [SUCCESS] IRN Generated for ".$row['billno'].": ".$irn;
				}
				else
				{
					$errMsg = str_replace(array('\'', '/', ':', '*', '?', '"', '<', '>', '|'), '', is_array($result['message'] ?? '') ? json_encode($result['message']) : ($result['message'] ?? json_encode($result)));
					$up = "update trans_b2beinvoice_mas set NotSyncflag=1, Reason='".$errMsg."' where eid='".$row['eid']."'";
					$this->db->query($up);

					$ins = "insert into Response_ZenGst(Status,Message,InsertDate,ehotelcode,Billno) 
							values('0','".$errMsg."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."')";
					$this->db->query($ins);
					echo " [ERROR] ".$errMsg;
				}
			}
		}

		// =========================================================================
		// SECTION 2: Credit Notes (CRN)
		// =========================================================================
		$sql2 = "select * from trans_b2beinvoice_mas where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=1 and isnull(creditnoteupdateflag,0)=0";
		$exe2 = $this->db->query($sql2);
		$no1 = $exe2->num_rows();
		if ($no1 > 0)
		{				
			$sql = "select top 1 isnull(CgstVal,0) as CgstVal, isnull(cesval,0) as CesVal, isnull(othchrg,0) as OthChrg, * from trans_b2beinvoice_mas mas						
					Inner join Mas_Hotel h on h.HotelCode = mas.ehotelcode
					left outer join Response_ZenGst Rz on Rz.refid = mas.id
					where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=1 and isnull(creditnoteupdateflag,0)=0";
			$exe = $this->db->query($sql);
			foreach ($exe->result_array() as $row)
			{   
				$buyeremail = !empty($row['buyeremail']) ? $row['buyeremail'] : '';
				$selleremail = !empty($row['selleremail']) ? $row['selleremail'] : '';

				$rawCgst = floatval($row['CgstVal'] ?? 0);
				$rawSgst = floatval($row['sgstval'] ?? 0);
				$rawIgst = floatval($row['igstval'] ?? 0);

				$isIntraState = ($rawCgst > 0 || $rawSgst > 0) || ($rawIgst == 0);

				if ($isIntraState) {
					$pos = !empty($row['sellerstcd']) ? str_pad($row['sellerstcd'], 2, '0', STR_PAD_LEFT) : '33';
					$actCgst = number_format($rawCgst, 2, '.', '');
					$actSgst = number_format($rawSgst, 2, '.', '');
					$actIgst = '0.00';
				} else {
					$pos = !empty($row['buyerpos']) ? str_pad($row['buyerpos'], 2, '0', STR_PAD_LEFT) : (!empty($row['buyerstcd']) ? str_pad($row['buyerstcd'], 2, '0', STR_PAD_LEFT) : substr($row['buyergstin'], 0, 2));
					$actCgst = '0.00';
					$actSgst = '0.00';
					$actIgst = number_format($rawIgst > 0 ? $rawIgst : ($rawCgst + $rawSgst), 2, '.', '');
				}

				$mas = '"DocDtls": {
						"Dt": "'.date("d/m/Y", strtotime($row['billdate'])).'",
						"No": "'.$row['billno'].'",
						"Typ": "CRN"
					},
					"ValDtls": {
						"AssVal": '.number_format($row['assval'], 2, '.', '').',
						"CesVal": '.number_format($row['CesVal'], 2, '.', '').',
						"CgstVal": '.$actCgst.',
						"IgstVal": '.$actIgst.',
						"OthChrg": '.number_format($row['OthChrg'], 2, '.', '').',
						"SgstVal": '.$actSgst.',
						"Discount": '.number_format($row['discount'] ?? 0, 2, '.', '').',
						"StCesVal": '.number_format($row['stcesval'] ?? 0, 2, '.', '').',
						"RndOffAmt": '.number_format($row['rndoffamt'] ?? 0, 2, '.', '').',
						"TotInvVal": '.number_format($row['Totinvval'], 2, '.', '').',
						"TotInvValFc": 0
					},					
					"TranDtls": {
						"RegRev": "'.(!empty($row['regrv']) ? $row['regrv'] : 'N').'",
						"SupTyp": "'.(!empty($row['suptyp']) ? $row['suptyp'] : 'B2B').'",
						"TaxSch": "'.(!empty($row['taxsh']) ? $row['taxsh'] : 'GST').'",
						"EcmGstin": null,
						"IgstOnIntra": "'.(!empty($row['igstonintra']) ? $row['igstonintra'] : 'N').'"
					},
					"SellerDtls": {
						"Em": "'.$selleremail.'",
						"Ph": "'.($row['sellerphone'] ?? '').'",
						"Loc": "'.($row['sellerloc'] ?? '').'",
						"Pin": '.intval($row['sellerpin'] ?? 641035).',
						"Stcd": "'.str_pad($row['sellerstcd'] ?? '33', 2, '0', STR_PAD_LEFT).'",
						"Addr1": "'.($row['selleraddrl'] ?? '').'",
						"Addr2": "'.($row['selleradd2'] ?? '').'",
						"Gstin": "'.($row['sellergstin'] ?? '').'",
						"LglNm": "'.($row['sellerlglnm'] ?? '').'"
					},
					"BuyerDtls": {
						"Em": "'.$buyeremail.'",
						"Ph": "'.($row['buyerphone'] ?? '').'",
						"Loc": "'.($row['buyerloc'] ?? '').'",
						"Pin": '.intval($row['buyerpin'] ?? 641001).',
						"Pos": "'.$pos.'",
						"Stcd": "'.str_pad($row['buyerstcd'] ?? (!empty($row['buyergstin']) ? substr($row['buyergstin'], 0, 2) : '33'), 2, '0', STR_PAD_LEFT).'",
						"Addr1": "'.($row['buyeraddrl'] ?? '').'",
						"Addr2": "'.($row['buyeradd2'] ?? '').'",
						"Gstin": "'.($row['buyergstin'] ?? '').'",
						"LglNm": "'.($row['buyerlglnm'] ?? '').'"
					},';			
			
				$ItemList = '';
				$sql2 = "select isnull(statecesnonadvlamt,0) as statecesnonadvlamt, qty, slno, unit, isnull(cesrt,0) as cesrt, gstrt, hsncd, assamt, isnull(cesamt,0) as cesamt, isnull(totamt,0) as totamt,
				cgstamt, freeqty, isnull(igstamt,0) as igstamt, isnull(othchrg,0) as othchrg, prddesc, isnull(sgstamt,0) as sgstamt, isnull(discount,0) as discount, isnull(pretaxval,0) as pretaxval, unitprice, isnull(statecesrt,0) as statecesrt, totitemval, isnull(statecesamt,0) as statecesamt,
				isnull(cesnonadvlamt,0) as cesnonadvlamt from trans_b2beinvoice_det where id='".$row['id']."' ";
				$exe2 = $this->db->query($sql2);
				$no2 = $exe2->num_rows();
				foreach ($exe2->result_array() as $row2)
				{	
					$no2 = $no2 - 1;							
					$itemCgstAmt = $isIntraState ? number_format($row2['cgstamt'], 2, '.', '') : '0.00';
					$itemSgstAmt = $isIntraState ? number_format($row2['sgstamt'], 2, '.', '') : '0.00';
					$itemIgstAmt = $isIntraState ? '0.00' : number_format(floatval($row2['igstamt']) > 0 ? $row2['igstamt'] : (floatval($row2['cgstamt']) + floatval($row2['sgstamt'])), 2, '.', '');

					$ItemList = $ItemList.'{
							"Qty": '.number_format($row2['qty'], 2, '.', '').',
							"SlNo": "'.$row2['slno'].'",
							"Unit": "'.(!empty($row2['unit']) ? $row2['unit'] : 'OTH').'",
							"CesRt": '.number_format($row2['cesrt'], 2, '.', '').',
							"GstRt": '.number_format($row2['gstrt'], 2, '.', '').',
							"HsnCd": "'.(!empty($row2['hsncd']) ? $row2['hsncd'] : '9963').'",
							"AssAmt": '.number_format($row2['assamt'], 2, '.', '').',
							"CesAmt": '.number_format($row2['cesamt'], 2, '.', '').',
							"TotAmt": '.number_format($row2['totamt'], 2, '.', '').',
							"CgstAmt": '.$itemCgstAmt.',
							"FreeQty": '.number_format($row2['freeqty'], 2, '.', '').',
							"IgstAmt": '.$itemIgstAmt.',
							"IsServc": "Y",
							"OthChrg": '.number_format($row2['othchrg'], 2, '.', '').',
							"PrdDesc": "'.substr(str_replace('"', '', $row2['prddesc']), 0, 100).'",
							"SgstAmt": '.$itemSgstAmt.',
							"Discount": '.number_format($row2['discount'], 2, '.', '').',
							"PreTaxVal": '.number_format($row2['pretaxval'], 2, '.', '').',
							"UnitPrice": '.number_format($row2['unitprice'], 2, '.', '').',
							"StateCesRt": '.number_format($row2['statecesrt'], 2, '.', '').',
							"TotItemVal": '.number_format($row2['totitemval'], 2, '.', '').',
							"StateCesAmt": '.number_format($row2['statecesamt'], 2, '.', '').',
							"CesNonAdvlAmt": '.number_format($row2['cesnonadvlamt'], 2, '.', '').',
							"StateCesNonAdvlAmt": '.number_format($row2['statecesnonadvlamt'], 2, '.', '').'
						}';
					if ($no2 > 0)
					{
						$ItemList = $ItemList.',';
					}						
				}

				$Credit = '"PayDtls": { "CrDay": 0 },
						   "RefDtls": { "InvRm": "Remarks" },		
						   "TalUN": "administrator",
						   "TalSlNo": "0",
						   "VchName": "Credit Note",
						   "Department":"'.($row['sellerlglnm'] ?? '').'"';

				$token = !empty($row['Zen_Token']) ? $row['Zen_Token'] : (!empty($row['Token']) ? $row['Token'] : '226e1ba9-a1ed-4249-9820-fa7a67cb1350');

				$curl = curl_init();
				curl_setopt_array($curl, array(
					CURLOPT_URL => 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/',
					CURLOPT_RETURNTRANSFER => true,
					CURLOPT_ENCODING => '',
					CURLOPT_MAXREDIRS => 10,
					CURLOPT_TIMEOUT => 45,
					CURLOPT_FOLLOWLOCATION => true,
					CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
					CURLOPT_CUSTOMREQUEST => 'POST',
					CURLOPT_POSTFIELDS => '{
						'.$mas.'										
						"Version": "1.1",
						"ItemList": ['.$ItemList.'],
						'.$Credit.'
					}',
					CURLOPT_HTTPHEADER => array(
						'Token: '.$token,
						'Content-Type: application/json'
					),
				));

				$response = curl_exec($curl);
				curl_close($curl);
				$result = json_decode($response, true);
				if (isset($result[0])) {
					$result = $result[0];
				}

				$rp = isset($result['status']) ? $result['status'] : (isset($result['success']) && $result['success'] ? '1' : '0');
				if ($rp == '1' || !empty($result['Irn']) || !empty($result['irn']))
				{
					$irn = !empty($result['Irn']) ? $result['Irn'] : (!empty($result['irn']) ? $result['irn'] : '');
					$ackDt = !empty($result['AckDt']) ? $result['AckDt'] : (!empty($result['ack_dt']) ? $result['ack_dt'] : '');
					$ackNo = !empty($result['AckNo']) ? $result['AckNo'] : (!empty($result['ack_no']) ? $result['ack_no'] : '');
					$signedQr = !empty($result['SignedQRCode']) ? $result['SignedQRCode'] : (!empty($result['signed_qr_code']) ? $result['signed_qr_code'] : '');
					$signedInv = !empty($result['SignedInvoice']) ? $result['SignedInvoice'] : (!empty($result['signed_invoice']) ? $result['signed_invoice'] : '');
					$uuid = !empty($result['uuid']) ? $result['uuid'] : '';
					$pdfUrl = !empty($result['InvoicePdfUrl']) ? $result['InvoicePdfUrl'] : (!empty($result['invoice_pdf_url']) ? $result['invoice_pdf_url'] : '');
					$qrUrl = !empty($result['SignedQrCodeImgUrl']) ? $result['SignedQrCodeImgUrl'] : (!empty($result['signed_qr_code_img_url']) ? $result['signed_qr_code_img_url'] : '');

					$ins = "insert into Response_ZenGst(Status,Message,Irn,AckDt,AckNo,SignedQRCode,SignedInvoice,uuid,SignedQrCodeImgUrl,InvoicePdfUrl,InsertDate,ehotelcode,Billno,refid,creditnoteupdateflag) 
							values('1','Success','".$irn."','".$ackDt."','".$ackNo."'
							,'".$signedQr."','".$signedInv."','".$uuid."','".$qrUrl."','".$pdfUrl."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."','".$row['id']."',1)";
					$this->db->query($ins);

					$update = "Update trans_b2beinvoice_mas set Syncflag=1, creditnoteupdateflag=1, NotSyncflag=0, Irn='".$irn."', AckNo='".$ackNo."', AckDt='".$ackDt."' where eid='".$row['eid']."'";
					$this->db->query($update);
					echo " [SUCCESS] Credit Note Synced for ".$row['billno'].": ".$irn;
				}
				else
				{
					$errMsg = str_replace(array('\'', '/', ':', '*', '?', '"', '<', '>', '|'), '', is_array($result['message'] ?? '') ? json_encode($result['message']) : ($result['message'] ?? json_encode($result)));
					$up = "update trans_b2beinvoice_mas set NotSyncflag=1, Reason='".$errMsg."' where eid='".$row['eid']."'";
					$this->db->query($up);
					echo " [CRN ERROR] ".$errMsg;
				}
			}
		}

		// =========================================================================
		// SECTION 3: Invoice Cancellation
		// =========================================================================
		$sql3 = "select * from trans_b2beinvoice_mas where isnull(Syncflag,0)=1 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=0 and isnull(cancelflag,0)=1 and isnull(cancelsyncflag,0)=0";
		$exe3 = $this->db->query($sql3);
		$no3 = $exe3->num_rows();
		if ($no3 > 0)
		{				
			$sqlc = "select top 1 isnull(CgstVal,0) as CgstVal, isnull(cesval,0) as CesVal, isnull(othchrg,0) as OthChrg, * from trans_b2beinvoice_mas mas						
					Inner join Mas_Hotel h on h.HotelCode = mas.ehotelcode
					where isnull(Syncflag,0)=1 and isnull(NotSyncflag,0)=0 and isnull(cancelflag,0)=1 and isnull(cancelsyncflag,0)=0";
			$exec = $this->db->query($sqlc);
			foreach ($exec->result_array() as $row3)
			{   
				$cancelPayload = json_encode(array(
					"Irn" => $row3['Irn'],
					"CnlRsn" => "1",
					"CnlRem" => !empty($row3['cancelremarks']) ? $row3['cancelremarks'] : "Order Cancelled"
				));

				$token = !empty($row3['Zen_Token']) ? $row3['Zen_Token'] : (!empty($row3['Token']) ? $row3['Token'] : '226e1ba9-a1ed-4249-9820-fa7a67cb1350');

				$curl3 = curl_init();
				curl_setopt_array($curl3, array(
					CURLOPT_URL => 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/cancel/',
					CURLOPT_RETURNTRANSFER => true,
					CURLOPT_ENCODING => '',
					CURLOPT_MAXREDIRS => 10,
					CURLOPT_TIMEOUT => 45,
					CURLOPT_FOLLOWLOCATION => true,
					CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
					CURLOPT_CUSTOMREQUEST => 'POST',
					CURLOPT_POSTFIELDS => $cancelPayload,
					CURLOPT_HTTPHEADER => array(
						'Token: '.$token,
						'Content-Type: application/json'
					),
				));
				
				$response = curl_exec($curl3);
				curl_close($curl3);
				$result = json_decode($response, true);
				if (isset($result[0])) {
					$result = $result[0];
				}

				$rp3 = isset($result['status']) ? $result['status'] : (isset($result['success']) && $result['success'] ? '1' : '0');
				if ($rp3 == '1' || !empty($result['Irn']) || !empty($result['irn']))
				{
					$update4 = "Update trans_b2beinvoice_mas set CancelSyncflag=1, CancelNotSyncflag=0, CancelReason='Success' where eid='".$row3['eid']."'";
					$this->db->query($update4);
					echo " [SUCCESS] Invoice Cancelled: ".$row3['billno'];
				}
				else
				{
					$errMsg = str_replace(array('\'', '/', ':', '*', '?', '"', '<', '>', '|'), '', is_array($result['message'] ?? '') ? json_encode($result['message']) : ($result['message'] ?? json_encode($result)));
					$up4 = "update trans_b2beinvoice_mas set CancelNotSyncflag=1, CancelReason='".$errMsg."' where eid='".$row3['eid']."'";
					$this->db->query($up4);
					echo " [CANCEL ERROR] ".$errMsg;
				}
			}
		}
	}
}
`;
