<?php
defined('BASEPATH') OR exit('No direct script access allowed');


class Sync extends CI_Controller {
	public function index()
	{
		header("Refresh:10");	
		//$this->load->view('welcome_message');
		echo "Refreshing...";
		$date = date("Y/m/d");
		echo $time = date("h:i:s");
		$sql1="select * from trans_b2beinvoice_mas where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=0";
		$exe1= $this->db->query($sql1);
		$no = $exe1->num_rows();
		if(!$no=='0')
		  {				
		       $sql="select top 1 isnull(CgstVal,0)as CgstVal, isnull(cesval,0)as CesVal,isnull(othchrg,0) as OthChrg, * from trans_b2beinvoice_mas mas						
				Inner join 	Mas_Hotel h on h.HotelCode=mas.ehotelcode
				where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=0";
			$exe = $this->db->query($sql);
			foreach ($exe->result_array() as $row)
			{ 
				  if($row['buyeremail'])
				{   $buyeremail=$row['buyeremail'];
					
					
				}
				else
				{ $buyeremail='';
					}

					$legalName = $row['buyerlglnm'] ?? '';

					if (!empty($legalName)) {
						$encoding = mb_detect_encoding($legalName, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
						$legalNames = mb_convert_encoding($legalName, 'UTF-8', $encoding ?: 'ISO-8859-1');
					} else {
						$legalNames = '';
					}
			
				if($row['selleremail'])
				{$selleremail=$row['selleremail'];}
				else
				{$selleremail='';}
			    ////.number_format($row['discount'],2,'.', '').

				$addr1 = preg_replace('/[^a-zA-Z0-9\s,.-]/', '', $row['buyeraddrl']);
                $addr2 = preg_replace('/[^a-zA-Z0-9\s,.-]/', '', $row['buyeradd2']);
				

				$mas= '"DocDtls": {
						"Dt": "'.date("d/m/Y",strtotime($row['billdate'])).'",
						"No": "'.$row['billno'].'",
						"Typ": "'.$row['typ'].'"
					},
					"ValDtls": {
						"AssVal": '.number_format($row['assval'],2,'.', '').',
						"CesVal": '.number_format($row['CesVal'],2,'.', '').',
						"CgstVal": '.number_format($row['CgstVal'],2,'.', '').',
						"IgstVal": '.number_format($row['igstval'],2,'.', '').',
						"OthChrg": '.number_format($row['OthChrg'],2,'.', '').',
						"SgstVal": '.number_format($row['sgstval'],2,'.', '').',
						"Discount": 0.00,
						"StCesVal": '.number_format($row['stcesval'],2,'.', '').',
						"RndOffAmt": '.number_format($row['rndoffamt'],2,'.', '').',
						"TotInvVal": '.number_format($row['Totinvval'],2,'.', '').',
						"TotInvValFc": 0
					},					
					"TranDtls": {
						"RegRev": "'.$row['regrv'].'",
						"SupTyp": "'.$row['suptyp'].'",
						"TaxSch": "'.$row['taxsh'].'",
						"EcmGstin": null,
						"IgstOnIntra": "'.$row['igstonintra'].'"
					},
					"SellerDtls": {
						"Em": "'.$selleremail.'",
						"Ph": "'.$row['sellerphone'].'",
						"Loc": "'.$row['sellerloc'].'",
						"Pin": '.$row['sellerpin'].',
						"Stcd": "'.$row['sellerstcd'].'",
						"Addr1": "'.$row['selleraddrl'].'",
						"Addr2": "'.$row['selleradd2'].'",
						"Gstin": "'.$row['sellergstin'].'",
						"LglNm": "'.$row['sellerlglnm'].'"
					},
					"BuyerDtls": {
						"Em": "'.$buyeremail.'",
						"Ph": "'.$row['buyerphone'].'",
						"Loc": "'.$row['buyerloc'].'",
						"Pin": '.$row['buyerpin'].',
						"Pos": "'.$row['buyerpos'].'",
						"Stcd": "'.$row['buyerstcd'].'",
						"Addr1": "'.$addr1.'",
						"Addr2": "'.$addr2.'",
						"Gstin": "'.$row['buyergstin'].'",
						"LglNm": "'.$legalNames.'"
					}';			
			
				$ItemList='';
				 $sql2="select isnull(statecesnonadvlamt,0) as statecesnonadvlamt,qty,slno,unit,isnull(cesrt,0)as cesrt,gstrt,hsncd,assamt,isnull(cesamt,0)as cesamt,isnull(totamt,0)as totamt,
				cgstamt,freeqty,isnull(igstamt,0)as igstamt,isnull(othchrg,0) as othchrg,prddesc,isnull(sgstamt,0)as sgstamt,isnull(discount,0)as discount,isnull(pretaxval,0)as pretaxval,unitprice,isnull(statecesrt,0) as statecesrt,totitemval,isnull(statecesamt,0) as statecesamt,
				isnull(cesnonadvlamt,0)as cesnonadvlamt from trans_b2beinvoice_det where id='".$row['id']."' ";
				$exe2= $this->db->query($sql2);
				$no2 = $exe2->num_rows();
				foreach ($exe2->result_array() as $row2)
				{	$no2=$no2-1;							
					//$Allowance=$row['ALLOWANCE'];
					 $ItemList=$ItemList.'{
							"Qty": '.number_format($row2['qty'],2,'.','').',
							"SlNo": "'.$row2['slno'].'",
							"Unit": "'.$row2['unit'].'",
							"CesRt": '.number_format($row2['cesrt'],2,'.','').',
							"GstRt": '.number_format($row2['gstrt'],2,'.','').',
							"HsnCd": "'.$row2['hsncd'].'",
							"AssAmt": '.number_format($row2['assamt'],2,'.','').',
							"CesAmt": '.number_format($row2['cesamt'],2,'.','').',
							"TotAmt": '.number_format($row2['totamt'],2,'.','').',
							"CgstAmt": '.number_format($row2['cgstamt'],2,'.','').',
							"FreeQty": '.number_format($row2['freeqty'],2,'.','').',
							"IgstAmt": '.number_format($row2['igstamt'],2,'.','').',
							"IsServc": "Y",
							"OthChrg": '.number_format($row2['othchrg'],2,'.', '').',
							"PrdDesc": "'.$row2['prddesc'].'",
							"SgstAmt": '.number_format($row2['sgstamt'],2,'.','').',
							"Discount": '.number_format($row2['discount'],2,'.','').',
							"PreTaxVal":'.number_format($row2['pretaxval'],2,'.','').',
							"UnitPrice":'.number_format($row2['unitprice'],2,'.','').',
							"StateCesRt": '.number_format($row2['statecesrt'],2,'.','').',
							"TotItemVal": '.number_format($row2['totitemval'],2,'.', '').',
							"StateCesAmt": '.number_format($row2['statecesamt'],2,'.', '').',
							"CesNonAdvlAmt": '.number_format($row2['cesnonadvlamt'],2,'.', '').',
							"StateCesNonAdvlAmt":  '.number_format($row2['statecesnonadvlamt'],2,'.', '').'
						}';
					if($no2>0)
					{
						 $ItemList=$ItemList.',';
					}						
				};
				// echo "<pre>Payload:\n";
				// echo '{
				// 	'.$mas.',
				// 	"Version": "1.1",
				// 	"ItemList": ['.$ItemList.']
				 //}';
				 //echo "</pre>";
				 //echo $row['Zen_Token'];
				//echo '".$ItemList."';
	            // exit;
				//echo $mas;
			    //echo $ItemList;
				//exit ;
				$curl = curl_init();
				 curl_setopt_array($curl, array(
				CURLOPT_URL => 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/',
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_ENCODING => '',
				CURLOPT_MAXREDIRS => 10,
				CURLOPT_TIMEOUT => 0,
				CURLOPT_FOLLOWLOCATION => true,
				CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
				CURLOPT_CUSTOMREQUEST => 'POST',
				CURLOPT_POSTFIELDS => '{
					'.$mas.',										
					"Version": "1.1",
					"ItemList": ['.$ItemList.']								
				}',
				CURLOPT_HTTPHEADER => array(
					//'Token: 226e1ba9-a1ed-4249-9820-fa7a67cb1350',
					'Token: '.$row['Zen_Token'],
					'Content-Type: application/json'
				),
				));

				// 	echo '{
				// 		'.$mas.',										
				// 	"Version": "1.1",
				// 	"ItemList": ['.$ItemList.']	
				// }';
			
			    $response = curl_exec($curl);
				curl_close($curl);
		
				  $result=json_decode($response,true);
			
                 
				// print_r($result);
				
				 $rp = $result['status'];
				if($rp =='1')
				{
					$ins="insert into Response_ZenGst(Status,Message,Irn,AckDt,AckNo,EwbDt,EwbNo,Status1,Remarks,AckNoStr,InfoDtls,EwbValidTill,SignedQRCode,SignedInvoice,uuid,SignedQrCodeImgUrl,InvoicePdfUrl,IrnStatus,EwbStatus,Irp,InsertDate,ehotelcode,Billno) 
					 values('".$result['status']."','".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."','".$result['Irn']."','".$result['AckDt']."','".$result['AckNo']."','".$result['EwbDt']."','".$result['EwbNo']."','".$result['Status']."','".$result['Remarks']."','".$result['AckNoStr']."','".$result['InfoDtls']."','".$result['EwbValidTill']."'
					 ,'".$result['SignedQRCode']."','".$result['SignedInvoice']."','".$result['uuid']."','".$result['SignedQrCodeImgUrl']."','".$result['InvoicePdfUrl']."','".$result['IrnStatus']."','".$result['EwbStatus']."','".$result['Irp']."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."')";
					$exe= $this->db->query($ins);
					if($result['SignedInvoice'])
					{
						echo $Path='../../ftproot/SignedQrCode/'.$row['ehotelcode'];
						if (!file_exists($Path)) {
							mkdir($Path, 0777, true);
						}
						// Remote image URL
						$url ='https://my.gstzen.in'.$result['InvoicePdfUrl'];
						// Image path
						$img = '../../ftproot/SignedQrCode/'.$row['ehotelcode'].'/'.$row['billno'].'.pdf';
						// Save image 
						file_put_contents($img, file_get_contents($url));
						
						$url ='https://my.gstzen.in'.$result['SignedQrCodeImgUrl'];
						$img = '../../ftproot/SignedQrCode/'.$row['ehotelcode'].'/'.$row['billno'].'.png';
						file_put_contents($img, file_get_contents($url));
					}
					$update="Update trans_b2beinvoice_mas set Syncflag=1,Reason='".$result['message']."' where eid='".$row['eid']."'";
					$exe= $this->db->query($update);
				}
				else
				{
				 $up="update trans_b2beinvoice_mas set NotSyncflag=1,Reason='".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."' where eid='".$row['eid']."'";
					$exe= $this->db->query($up);

					  $ins="insert into Response_ZenGst(Status,Message,Irn,uuid,IrnStatus,EwbStatus,Irp,InsertDate,ehotelcode,Billno) 
					values('".$result['status']."','".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."','".$result['Irn']."','".$result['uuid']."','".$result['IrnStatus']."','".$result['EwbStatus']."','".$result['Irp']."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."')";
				   $exe= $this->db->query($ins);
				   

				}

			}
		  }
		 // Credit Entry -Einvoice Gendrate 16-08-2023
		//"AckNo": "'.$row['AckNo'].'",
		///"AckDt": "'.$row['AckDt'].'",
		///"Irn": "'.$row['Irn'].'",  */  
     	 $sql2="select * from trans_b2beinvoice_mas where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=1 and isnull(creditnoteupdateflag,0)=0";
		$exe2= $this->db->query($sql2);
		$no1 = $exe2->num_rows();
		if(!$no1=='0')
		  {				
		     $sql="select top 1 isnull(CgstVal,0)as CgstVal, isnull(cesval,0)as CesVal,isnull(othchrg,0) as OthChrg, * from trans_b2beinvoice_mas mas						
				Inner join 	Mas_Hotel h on h.HotelCode=mas.ehotelcode
				left outer join Response_ZenGst Rz on Rz.refid=mas.id
				where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=1 and isnull(creditnoteupdateflag,0)=0";
			$exe = $this->db->query($sql);
			foreach ($exe->result_array() as $row)
			{   if($row['buyeremail'])
				{$buyeremail=$row['buyeremail'];}
				else
				{$buyeremail='null';}
			
				if($row['selleremail'])
				{$selleremail=$row['selleremail'];}
				else
				{$selleremail='null';}
			
				$mas= ' 		
				"DocDtls": {
						"Dt": "'.date("d/m/Y",strtotime($row['billdate'])).'",
						"No": "'.$row['billno'].'",
						"Typ": "CRN"
					},
					"ValDtls": {
						"AssVal": '.number_format($row['assval'],2,'.', '').',
						"CesVal": '.number_format($row['CesVal'],2,'.', '').',
						"CgstVal": '.number_format($row['CgstVal'],2,'.', '').',
						"IgstVal": '.number_format($row['igstval'],2,'.', '').',
						"OthChrg": '.number_format($row['OthChrg'],2,'.', '').',
						"SgstVal": '.number_format($row['sgstval'],2,'.', '').',
						"Discount": '.number_format($row['discount'],2,'.', '').',
						"StCesVal": '.number_format($row['stcesval'],2,'.', '').',
						"RndOffAmt": '.number_format($row['rndoffamt'],2,'.', '').',
						"TotInvVal": '.number_format($row['Totinvval'],2,'.', '').',
						"TotInvValFc": 0
					},					
					"TranDtls": {
						"RegRev": "'.$row['regrv'].'",
						"SupTyp": "'.$row['suptyp'].'",
						"TaxSch": "'.$row['taxsh'].'",
						"EcmGstin": null,
						"IgstOnIntra": "'.$row['igstonintra'].'"
					},
					"SellerDtls": {
						"Em": "'.$selleremail.'",
						"Ph": "'.$row['sellerphone'].'",
						"Loc": "'.$row['sellerloc'].'",
						"Pin": '.$row['sellerpin'].',
						"Stcd": "'.$row['sellerstcd'].'",
						"Addr1": "'.$row['selleraddrl'].'",
						"Addr2": "'.$row['selleradd2'].'",
						"Gstin": "'.$row['sellergstin'].'",
						"LglNm": "'.$row['sellerlglnm'].'"
					},
					"BuyerDtls": {
						"Em": "'.$buyeremail.'",
						"Ph": "'.$row['buyerphone'].'",
						"Loc": "'.$row['buyerloc'].'",
						"Pin": '.$row['buyerpin'].',
						"Pos": "'.$row['buyerpos'].'",
						"Stcd": "'.$row['buyerstcd'].'",
						"Addr1": "'.$row['buyeraddrl'].'",
						"Addr2": "'.$row['buyeradd2'].'",
						"Gstin": "'.$row['buyergstin'].'",
						"LglNm": "'.$row['buyerlglnm'].'"
					},';			
			
				$ItemList='';
				$sql2="select isnull(statecesnonadvlamt,0) as statecesnonadvlamt,qty,slno,unit,isnull(cesrt,0)as cesrt,gstrt,hsncd,assamt,isnull(cesamt,0)as cesamt,isnull(totamt,0)as totamt,
				cgstamt,freeqty,isnull(igstamt,0)as igstamt,isnull(othchrg,0) as othchrg,prddesc,isnull(sgstamt,0)as sgstamt,isnull(discount,0)as discount,isnull(pretaxval,0)as pretaxval,unitprice,isnull(statecesrt,0) as statecesrt,totitemval,isnull(statecesamt,0) as statecesamt,
				isnull(cesnonadvlamt,0)as cesnonadvlamt from trans_b2beinvoice_det where id='".$row['id']."' ";
				$exe2= $this->db->query($sql2);
				$no2 = $exe2->num_rows();
				foreach ($exe2->result_array() as $row2)
				{	$no2=$no2-1;							
					
					 $ItemList=$ItemList.'{
							"Qty": '.number_format($row2['qty'],2,'.','').',
							"SlNo": "'.$row2['slno'].'",
							"Unit": "'.$row2['unit'].'",
							"CesRt": '.number_format($row2['cesrt'],2,'.','').',
							"GstRt": '.number_format($row2['gstrt'],2,'.','').',
							"HsnCd": "'.$row2['hsncd'].'",
							"AssAmt": '.number_format($row2['assamt'],2,'.','').',
							"CesAmt": '.number_format($row2['cesamt'],2,'.','').',
							"TotAmt": '.number_format($row2['totamt'],2,'.','').',
							"CgstAmt": '.number_format($row2['cgstamt'],2,'.','').',
							"FreeQty": '.number_format($row2['freeqty'],2,'.','').',
							"IgstAmt": '.number_format($row2['igstamt'],2,'.','').',
							"IsServc": "Y",
							"OthChrg": '.number_format($row2['othchrg'],2,'.', '').',
							"PrdDesc": "'.$row2['prddesc'].'",
							"SgstAmt": '.number_format($row2['sgstamt'],2,'.','').',
							"Discount": '.number_format($row2['discount'],2,'.','').',
							"PreTaxVal":'.number_format($row2['pretaxval'],2,'.','').',
							"UnitPrice":'.number_format($row2['unitprice'],2,'.','').',
							"StateCesRt": '.number_format($row2['statecesrt'],2,'.','').',
							"TotItemVal": '.number_format($row2['totitemval'],2,'.', '').',
							"StateCesAmt": '.number_format($row2['statecesamt'],2,'.', '').',
							"CesNonAdvlAmt": '.number_format($row2['cesnonadvlamt'],2,'.', '').',
							"StateCesNonAdvlAmt":  '.number_format($row2['statecesnonadvlamt'],2,'.', '').'
						}';
					if($no2>0)
					{
						$ItemList=$ItemList.',';
					}						
				};
				$Credit='
					"PayDtls": {
						"CrDay": 0
					},
					"RefDtls": {
						"InvRm": "Remarks"
						},		
				  "TalUN": "administrator",
				  "TalSlNo": "0",
				  "VchName": "Credit Note",
				  "Department":"'.$row['sellerlglnm'].'"';
				/*echo '{ '.$row['Billno'].'
					'.$mas.'										
					"Version": "1.1",
					"ItemList": ['.$ItemList.']								
				}';
			exit;*/
				$curl = curl_init();
				curl_setopt_array($curl, array(
				CURLOPT_URL => 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/',
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_ENCODING => '',
				CURLOPT_MAXREDIRS => 10,
				CURLOPT_TIMEOUT => 0,
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
					//'Token: 226e1ba9-a1ed-4249-9820-fa7a67cb1350',
					'Token: '.$row['Zen_Token'],
					'Content-Type: application/json'
				),
				));

				$response = curl_exec($curl);
				curl_close($curl);
				echo $response;	 
				$result=json_decode($response,true);
				$rp = $result['status'];
				if($rp =='1')
				{
					$ins="insert into Response_ZenGst(Status,Message,Irn,AckDt,AckNo,EwbDt,EwbNo,Status1,Remarks,AckNoStr,InfoDtls,EwbValidTill,SignedQRCode,SignedInvoice,uuid,SignedQrCodeImgUrl,InvoicePdfUrl,IrnStatus,EwbStatus,Irp,InsertDate,ehotelcode,Billno,refid,creditnoteupdateflag) 
					 values('".$result['status']."','".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."','".$result['Irn']."','".$result['AckDt']."','".$result['AckNo']."','".$result['EwbDt']."','".$result['EwbNo']."','".$result['Status']."','".$result['Remarks']."','".$result['AckNoStr']."','".$result['InfoDtls']."','".$result['EwbValidTill']."'
					 ,'".$result['SignedQRCode']."','".$result['SignedInvoice']."','".$result['uuid']."','".$result['SignedQrCodeImgUrl']."','".$result['InvoicePdfUrl']."','".$result['IrnStatus']."','".$result['EwbStatus']."','".$result['Irp']."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."','".$row['id']."',1)";
					$exe= $this->db->query($ins);
					if($result['SignedInvoice'])
					{
						$Path='../../ftproot/SignedQrCode/'.$row['ehotelcode'];
						if (!file_exists($Path)) {
							mkdir($Path, 0777, true);
						}
						// Remote image URL
						$url ='https://my.gstzen.in'.$result['InvoicePdfUrl'];
						// Image path
						$img = '../../ftproot/SignedQrCode/'.$row['ehotelcode'].'/'.$row['billno'].'.pdf';
						// Save image 
						file_put_contents($img, file_get_contents($url));
						
						$url ='https://my.gstzen.in'.$result['SignedQrCodeImgUrl'];
						$img = '../../ftproot/SignedQrCode/'.$row['ehotelcode'].'/'.$row['billno'].'.png';
						file_put_contents($img, file_get_contents($url));
					}
					$update="Update trans_b2beinvoice_mas set Syncflag=1,creditnoteupdateflag=1,Reason='".$result['message']."' where eid='".$row['eid']."'";
					$exe= $this->db->query($update);
					
					$ins="insert into Response_ZenGst(Status,Message,Irn,uuid,IrnStatus,EwbStatus,Irp,InsertDate,ehotelcode,Billno,refid,creditnoteupdateflag) 
					values('".$result['status']."','".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."','".$result['Irn']."','".$result['uuid']."','".$result['IrnStatus']."','".$result['EwbStatus']."','".$result['Irp']."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."','".$row['id']."','1')";
				   $exe= $this->db->query($ins);		   

				}
				else
				{
					$up="update trans_b2beinvoice_mas set NotSyncflag=1,Reason='".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."' where eid='".$row['eid']."'";
					$exe= $this->db->query($up);

					 $ins="insert into Response_ZenGst(Status,Message,Irn,uuid,IrnStatus,EwbStatus,Irp,InsertDate,ehotelcode,Billno,refid,creditnoteupdateflag) 
					values('".$result['status']."','".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."','".$result['Irn']."','".$result['uuid']."','".$result['IrnStatus']."','".$result['EwbStatus']."','".$result['Irp']."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."','".$row['id']."','1')";
				   $exe= $this->db->query($ins);		   

				}

			}
		  }
		 // Debit Entry -Einvoice Gendrate 16-08-2023
		  else
		  {					
			
		  }


		  //Einvoice Cancellation - 22/04/2025 - Legends Inn
		$sql3="select * from trans_b2beinvoice_mas where isnull(Syncflag,0)=1 and isnull(NotSyncflag,0)=0 and isnull(creditnoteflag,0)=0 and isnull(cancelflag,0)=1 and isnull(cancelsyncflag,0)=0";
		$exe3= $this->db->query($sql3);
		$no3 = $exe3->num_rows();
		if(!$no3=='0')
		  {				
		echo $sqlc="select top 1 isnull(CgstVal,0)as CgstVal, isnull(cesval,0)as CesVal,isnull(othchrg,0) as OthChrg, * from trans_b2beinvoice_mas mas						
				Inner join 	Mas_Hotel h on h.HotelCode=mas.ehotelcode
				where isnull(Syncflag,0)=0 and isnull(NotSyncflag,0)=0 and isnull(cancelflag,0)=1 and isnull(cancelsyncflag,0)=0";
			$exec = $this->db->query($sqlc);
			foreach ($exec->result_array() as $row3)
			{   if($row3['buyeremail'])
				{$buyeremail=$row3['buyeremail'];}
				else
				{$buyeremail='null';}
			
				if($row3['selleremail'])
				{$selleremail=$row3['selleremail'];}
				else
				{$selleremail='null';}
			
				$mas3= '"DocDtls": {
						"Dt": "'.date("d/m/Y",strtotime($row3['billdate'])).'",
						"No": "'.$row3['billno'].'",
						"Typ": "'.$row3['typ'].'"
					},
					"ValDtls": {
						"AssVal": '.number_format($row3['assval'],2,'.', '').',
						"CesVal": '.number_format($row3['CesVal'],2,'.', '').',
						"CgstVal": '.number_format($row3['CgstVal'],2,'.', '').',
						"IgstVal": '.number_format($row3['igstval'],2,'.', '').',
						"OthChrg": '.number_format($row3['OthChrg'],2,'.', '').',
						"SgstVal": '.number_format($row3['sgstval'],2,'.', '').',
						"Discount": '.number_format($row3['discount'],2,'.', '').',
						"StCesVal": '.number_format($row3['stcesval'],2,'.', '').',
						"RndOffAmt": '.number_format($row3['rndoffamt'],2,'.', '').',
						"TotInvVal": '.number_format($row3['Totinvval'],2,'.', '').',
						"TotInvValFc": 0
					},					
					"TranDtls": {
						"RegRev": "'.$row3['regrv'].'",
						"SupTyp": "'.$row3['suptyp'].'",
						"TaxSch": "'.$row3['taxsh'].'",
						"EcmGstin": null,
						"IgstOnIntra": "'.$row3['igstonintra'].'"
					},
					"SellerDtls": {
						"Em": "'.$selleremail.'",
						"Ph": "'.$row3['sellerphone'].'",
						"Loc": "'.$row3['sellerloc'].'",
						"Pin": '.$row3['sellerpin'].',
						"Stcd": "'.$row3['sellerstcd'].'",
						"Addr1": "'.$row3['selleraddrl'].'",
						"Addr2": "'.$row3['selleradd2'].'",
						"Gstin": "'.$row3['sellergstin'].'",
						"LglNm": "'.$row3['sellerlglnm'].'"
					},
					"BuyerDtls": {
						"Em": "'.$buyeremail.'",
						"Ph": "'.$row3['buyerphone'].'",
						"Loc": "'.$row3['buyerloc'].'",
						"Pin": '.$row3['buyerpin'].',
						"Pos": "'.$row3['buyerpos'].'",
						"Stcd": "'.$row3['buyerstcd'].'",
						"Addr1": "'.$row3['buyeraddrl'].'",
						"Addr2": "'.$row3['buyeradd2'].'",
						"Gstin": "'.$row3['buyergstin'].'",
						"LglNm": "'.$row3['buyerlglnm'].'"
					},';			
			
				$ItemList3='';
				$sql4="select isnull(statecesnonadvlamt,0) as statecesnonadvlamt,qty,slno,unit,isnull(cesrt,0)as cesrt,gstrt,hsncd,assamt,isnull(cesamt,0)as cesamt,isnull(totamt,0)as totamt,
				cgstamt,freeqty,isnull(igstamt,0)as igstamt,isnull(othchrg,0) as othchrg,prddesc,isnull(sgstamt,0)as sgstamt,isnull(discount,0)as discount,isnull(pretaxval,0)as pretaxval,unitprice,isnull(statecesrt,0) as statecesrt,totitemval,isnull(statecesamt,0) as statecesamt,
				isnull(cesnonadvlamt,0)as cesnonadvlamt from trans_b2beinvoice_det where id='".$row3['id']."' ";
				$exe4= $this->db->query($sql4);
				$no4 = $exe4->num_rows();
				foreach ($exe4->result_array() as $row4)
				{	$no4=$no4-1;							
					//$Allowance=$row['ALLOWANCE'];
					 $ItemList=$ItemList.'{
							"Qty": '.number_format($row4['qty'],2,'.','').',
							"SlNo": "'.$row4['slno'].'",
							"Unit": "'.$row4['unit'].'",
							"CesRt": '.number_format($row4['cesrt'],2,'.','').',
							"GstRt": '.number_format($row4['gstrt'],2,'.','').',
							"HsnCd": "'.$row4['hsncd'].'",
							"AssAmt": '.number_format($row4['assamt'],2,'.','').',
							"CesAmt": '.number_format($row4['cesamt'],2,'.','').',
							"TotAmt": '.number_format($row4['totamt'],2,'.','').',
							"CgstAmt": '.number_format($row4['cgstamt'],2,'.','').',
							"FreeQty": '.number_format($row4['freeqty'],2,'.','').',
							"IgstAmt": '.number_format($row4['igstamt'],2,'.','').',
							"IsServc": "Y",
							"OthChrg": '.number_format($row4['othchrg'],2,'.', '').',
							"PrdDesc": "'.$row4['prddesc'].'",
							"SgstAmt": '.number_format($row4['sgstamt'],2,'.','').',
							"Discount": '.number_format($row4['discount'],2,'.','').',
							"PreTaxVal":'.number_format($row4['pretaxval'],2,'.','').',
							"UnitPrice":'.number_format($row4['unitprice'],2,'.','').',
							"StateCesRt": '.number_format($row4['statecesrt'],2,'.','').',
							"TotItemVal": '.number_format($row4['totitemval'],2,'.', '').',
							"StateCesAmt": '.number_format($row4['statecesamt'],2,'.', '').',
							"CesNonAdvlAmt": '.number_format($row4['cesnonadvlamt'],2,'.', '').',
							"StateCesNonAdvlAmt":  '.number_format($row4['statecesnonadvlamt'],2,'.', '').'
						}';
					if($no4>0)
					{
						 $ItemList3=$ItemList3.',';
					}						
				};
				/*echo '{
					'.$mas.'										
					"Version": "1.1",
					"ItemList": ['.$ItemList.']								
				}';
			exit;*/
			 $ItemList3;
				$curl3 = curl_init();
				curl_setopt_array($curl, array(
				CURLOPT_URL => 'https://my.gstzen.in/~gstzen/a/post-einvoice-data/einvoice-json/cancel/',
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_ENCODING => '',
				CURLOPT_MAXREDIRS => 10,
				CURLOPT_TIMEOUT => 0,
				CURLOPT_FOLLOWLOCATION => true,
				CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
				CURLOPT_CUSTOMREQUEST => 'POST',
				CURLOPT_POSTFIELDS => '{
					'.$mas.'										
					"Version": "1.1",
					"ItemList": ['.$ItemList.']								
				}',
				CURLOPT_HTTPHEADER => array(
					//'Token: 226e1ba9-a1ed-4249-9820-fa7a67cb1350',
					'Token: '.$row['Zen_Token'],
					'Content-Type: application/json'
				),
				));
				
			 $response = curl_exec($curl3);
				curl_close($curl3);
				echo $response;	 
				 $result=json_decode($response,true);

				//print_r($result);
				echo"helllloooooo";
				echo $rp3 = $result['status'];
				if($rp3 =='1')
				{
					$ins="insert into Response_ZenGst(Status,Message,Irn,AckDt,AckNo,EwbDt,EwbNo,Status1,Remarks,AckNoStr,InfoDtls,EwbValidTill,SignedQRCode,SignedInvoice,uuid,SignedQrCodeImgUrl,InvoicePdfUrl,IrnStatus,EwbStatus,Irp,InsertDate,ehotelcode,Billno) 
					 values('".$result['status']."','".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."','".$result['Irn']."','".$result['AckDt']."','".$result['AckNo']."','".$result['EwbDt']."','".$result['EwbNo']."','".$result['Status']."','".$result['Remarks']."','".$result['AckNoStr']."','".$result['InfoDtls']."','".$result['EwbValidTill']."'
					 ,'".$result['SignedQRCode']."','".$result['SignedInvoice']."','".$result['uuid']."','".$result['SignedQrCodeImgUrl']."','".$result['InvoicePdfUrl']."','".$result['IrnStatus']."','".$result['EwbStatus']."','".$result['Irp']."',convert(varchar, getdate(), 120),'".$row['ehotelcode']."','".$row['billno']."')";
					$exe= $this->db->query($ins);
					if($result['SignedInvoice'])
					{
						/*echo $Path='../../ftproot/SignedQrCode/'.$row['ehotelcode'];
						if (!file_exists($Path)) {
							mkdir($Path, 0777, true);
						}
						// Remote image URL
						$url ='https://my.gstzen.in'.$result['InvoicePdfUrl'];
						// Image path
						$img = '../../ftproot/SignedQrCode/'.$row['ehotelcode'].'/'.$row['billno'].'.pdf';
						// Save image 
						file_put_contents($img, file_get_contents($url));
						
						$url ='https://my.gstzen.in'.$result['SignedQrCodeImgUrl'];
						$img = '../../ftproot/SignedQrCode/'.$row['ehotelcode'].'/'.$row['billno'].'.png';
						file_put_contents($img, file_get_contents($url));*/
					}
					$update4="Update trans_b2beinvoice_mas set CancelSyncflag=1,CancelReason='".$result['message']."' where eid='".$row4['eid']."'";
					$exe= $this->db->query($update4);
				}
				else
				{
				 $up4="update trans_b2beinvoice_mas set CancelNotSyncflag=1,CancelReason='".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."' where eid='".$row4['eid']."'";
					$exe= $this->db->query($up);

					 $ins4="insert into Response_ZenGst(Status,Message,Irn,uuid,IrnStatus,EwbStatus,Irp,InsertDate,ehotelcode,Billno) 
					values('".$result['status']."','".str_replace(str_split('\'\/:*?"<>|`'), '',$result['message'])."','".$result['Irn']."','".$result['uuid']."','".$result['IrnStatus']."','".$result['EwbStatus']."','".$result['Irp']."',convert(varchar, getdate(), 120),'".$row4['ehotelcode']."','".$row4['billno']."')";
				   $exe= $this->db->query($ins4);
				   

				}

			}
		  }


	}
}
