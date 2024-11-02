var BaniPay = {};
BaniPay.transactionType = "consumerAuth";
var urlBase = "";
var tokenizedCards = {};

function paymentBaniPay(affiliateId) {
	initializeBP();
	if (BaniPay.environmentType == "Dev") {
		urlBase = "https://staging.banipay.me/api/pagos";
	} else {
		urlBase = "https://v2.banipay.me/api/pagos";
	}
	BaniPay.affiliate = affiliateId;

	var paymentScript = document.getElementById("paymentScript");
	var paymentDescription = document.createElement("div");
	paymentDescription.id = "checkout";
	paymentDescription.classList.add('checkout');
	if (typeof BaniPay.wordpress === 'undefined') {
		BaniPay.platform = "standalone";
		paymentDescription.innerHTML =
			'<section><div class="product">   <div class="description"><h3 id="descriptionProduct">' +
			BaniPay.description + '</h3><h5 id="totalPrice">' + BaniPay.total +
			' ' + BaniPay.currency +
			'</h5></div></div><button onclick="startBanipay()" id="checkout-button">Pagar Ahora</button></section>';
	} else {
		BaniPay.platform = "wordpress";
		paymentDescription.innerHTML =
			'<section><div class="product">  <div class="description"><h3 id="descriptionProduct">' +
			BaniPay.description + '</h3><h5 id="totalPrice">' + BaniPay.total +
			' ' + BaniPay.currency +
			'</h5></div></div></section>';
	}

	paymentScript.after(paymentDescription);
	var minutesToAdd = 30;
	var currentDate = new Date();
	var futureDate = new Date(currentDate.getTime() + minutesToAdd * 60000);
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var a = JSON.parse(xhttp.responseText);
			BaniPay.bpPaymentId = a['id'];
			BaniPay.bpPaymentLink = a['link'];
		}
	};
	var url = urlBase + "/link-payment";
	xhttp.open("POST", url);
	xhttp.setRequestHeader("Content-Type", "application/json");
	xhttp.setRequestHeader("Accept", "application/json");
	const json = {
		"affiliate": affiliateId,
		"amount": BaniPay.total,
		"business": BaniPay.business,
		"code": BaniPay.externalCode,
		"currency": BaniPay.currency,
		"description": BaniPay.description,
		"expirationDate": futureDate.toISOString()
	};
	xhttp.send(JSON.stringify(json));



}




function initializeFlex() {
	getStates();
	document.getElementById('firstName').value = document.getElementById('billing_first_name').value;
	document.getElementById('lastName').value = document.getElementById('billing_last_name').value;
	document.getElementById('emailId').value = document.getElementById('billing_email').value;
	document.getElementById('phoneNumber').value = document.getElementById('billing_phone').value;

	try {
		document.getElementById('address').value = document.getElementById('billing_address_1').value;
		document.getElementById('city').value = document.getElementById('billing_city').value;
		document.getElementById('country').value = document.getElementById('billing_country').value;
		document.getElementById('administrativeArea').value = document.getElementById('billing_state').value.replace(document.getElementById('billing_country').value + "-", "");
		if (document.getElementById('billing_country').value == "BO") {
			document.getElementById('postalCode').value = "000";
			document.querySelector('.postalCode').style.display = "none";
		} else {

			document.getElementById('postalCode').value = document.getElementById('billing_postcode').value;
			document.querySelector('.postalCode').style.display = "block";
		}
	} catch (error) {
		console.log(error);
		document.getElementById('country').value = "BO";
		document.getElementById('postalCode').value = "000";
		document.querySelector('.postalCode').style.display = "none";
	}

	Cardinal.configure({
		logging: {
			level: "on"
		}
	});
	Cardinal.on("payments.setupComplete", function(data, jwt) {
		BaniPay.setupComplete = true;
	});
	Cardinal.on("payments.validated", function(data, jwt) {
		BaniPay.jwtAuth = jwt;
		console.log(jwt);
		if (typeof BaniPay.jwtAuth === 'undefined') {
			console.log('not yet validated');
		} else {
			console.log('validated');
			confirmPayment();
		}
	});
	var payButton = document.querySelector('#paybutton');
	var flexResponse = document.querySelector('#flexresponse');
	var expMonth = document.querySelector('#expMonth');
	var expYear = document.querySelector('#expYear');
	var errorsOutput = document.querySelector('#errorsOutput');
	var myStyles = {
		'input': {
			'font-size': '14px',
			'color': '#555'
		},
		':focus': {
			'color': 'blue'
		},
		':disabled': {
			'cursor': 'not-allowed'
		},
		'valid': {
			'color': '#3c763d'
		},
		'invalid': {
			'color': '#a94442'
		}
	};
	var url = urlBase + "/payment/cybersource/keys?targetUrl=" + location.origin;
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var captureContext = JSON.parse(xhttp.responseText);
			const flex = new Flex(captureContext['flexJwt']);
			var script = document.createElement('script');
			script.src = captureContext['fingerprintUrl'];
			document.getElementsByTagName("head")[0].appendChild(script);
			BaniPay.sessionId = captureContext['sessionId'];
			BaniPay.referenceId = captureContext['referenceId'];
			BaniPay.referenceNumber = captureContext['referenceNumber'];
			BaniPay.cardinalJwt = captureContext['cardinalJwt'];
			var microform = flex.microform({
				styles: myStyles
			});
			var number = microform.createField('number', {
				placeholder: '0000 0000 0000 0000'
			});
			var securityCode = microform.createField('securityCode', {
				placeholder: '•••'
			});
			number.load('#number-container');
			securityCode.load('#securityCode-container');
			number.on('change', function(data) {
				if (data.valid) {
					checkData();
				}
			});
			securityCode.on('change', function(data) {
				if (data.valid) {
					checkData();
				}
			});
			expMonth.addEventListener('change', function() {
				if (expMonth.value !== "-") {
					checkData();
				}

			});
			expYear.addEventListener('change', function() {
				if (expYear.value !== "-") {
					checkData();
				}
			});

			function checkData() {
				if (securityCode && number && expMonth.value !== "-" && expYear.value !== "-") {
					makeToken();
				}
			}




			function makeToken() {

				var options = {
					expirationMonth: expMonth.value,
					expirationYear: expYear.value
				};
				microform.createToken(options, function(err,
					token) {
					if (err) {
						console.error(err);
						errorsOutput.value = err.message;
					} else {
						flexResponse.value = JSON.stringify(token);
						BaniPay.flexResponse = JSON.stringify(token);
						var cardBin = parseBin(JSON.stringify(token));
						initCardinal(cardBin, expMonth.value, expYear.value);
					}
				});
			}
		}
	};
	xhttp.open("POST", url);
	xhttp.send();
}


function initCardinal(cardBin, expMonth, expYear) {
	BaniPay.orderObject = {
		Consumer: {
			Account: {
				AccountNumber: cardBin,
				ExpirationMonth: expMonth,
				ExpirationYear: expYear
			}
		}
	};
	Cardinal.setup('init', {
		jwt: BaniPay.cardinalJwt,
		order: BaniPay.orderObject
	});
}

function parseBin(token) {
	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));
	var parsed = JSON.parse(jsonPayload);
	var cardBin = parsed['content']['paymentInformation']['card']['number']['bin'];
	return cardBin;
}


function validateEmail(email) {
	var re = /\S+@\S+\.\S+/;
	return re.test(email);
}


function sendPayment() {
	var formElements = ['firstName', 'lastName', 'nit', 'phoneNumber', 'address', 'city'];
	var validForm = 0;
	var selectElements = ['administrativeArea', 'country'];
	var ccElements = ['expMonth', 'expYear'];
	console.log(validForm);
	for (elementId of formElements) {
		if (document.getElementById(elementId).value.length > 3) {
			document.getElementById(elementId).parentElement.parentElement.classList.remove("errorValid");
		} else {
			document.getElementById(elementId).parentElement.parentElement.classList.add("errorValid");
			validForm = validForm + 1;
		}
	}
	for (elementId of selectElements) {
		if (document.getElementById(elementId).value.length > 0) {
			document.getElementById(elementId).parentElement.parentElement.classList.remove("errorValid");
		} else {
			document.getElementById(elementId).parentElement.parentElement.classList.add("errorValid");
			validForm = validForm + 1;
		}
	}
	for (elementId of ccElements) {
		if (document.getElementById(elementId).value !== "-") {
			document.getElementById(elementId).parentElement.classList.remove("errorValid");
		} else {
			document.getElementById(elementId).parentElement.classList.add("errorValid");
			validForm = validForm + 1;
		}
	}
	if (validateEmail(document.getElementById('emailId').value)) {
		document.getElementById('emailId').parentElement.parentElement.classList.remove("errorValid");
	} else {
		document.getElementById('emailId').parentElement.parentElement.classList.add("errorValid");
		validForm = validForm + 1;
	}
	if (validForm > 0) {
		alert("Por favor completa los campos marcados.");
	} else {
		waitForCardinal();


	}
}

function waitForCardinal() {
	if (!BaniPay.setupComplete) {
		console.log("Not yet");
		setTimeout(waitForCardinal, 1000);
		return false;
	}
	sendPaymentCS();
	return true;
}


function sendPaymentCS() {
	var paymentMethodsBP = document.getElementById("paymentMethodsBP");
	paymentMethodsBP.classList.remove('BP-active');
	var finalResultsBP = document.getElementById("finalResultsBP");
	finalResultsBP.classList.add('BP-active');
	BaniPay.address = document.getElementById('address').value;
	BaniPay.city = document.getElementById('city').value;
	BaniPay.country = document.getElementById('country').value;
	BaniPay.postalCode = document.getElementById('postalCode').value;
	BaniPay.administrativeArea = document.getElementById('administrativeArea').value;
	BaniPay.phoneNumber = document.getElementById('phoneNumber').value;
	BaniPay.email = document.getElementById('emailId').value;
	BaniPay.documentNumber = document.getElementById('nit').value;
	BaniPay.firstName = document.getElementById('firstName').value;
	BaniPay.lastName = document.getElementById('lastName').value;
	BaniPay.expMonth = document.querySelector('#expMonth').value;
	BaniPay.expYear = document.querySelector('#expYear').value;
	BaniPay.bin = parseBin(BaniPay.flexResponse);
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var a = JSON.parse(xhttp.responseText);
			BaniPay.csStatus = a['status'];
			//			BaniPay.bpPaymentId = a['id'];
			if (a['payment']) {
				BaniPay.bpTransactionId = a['payment']['transactionGenerated'];
			}
			BaniPay.authTransactionId = a['authTransactionId'];
			if (BaniPay.csStatus !== 'AUTHORIZED') {
				BaniPay.AcsUrl = a['acsUrl'];
				BaniPay.Payload = a['payload'];
				enrolPayment();
			} else {
				finalizar("CYBER_SOURCE", BaniPay.bpPaymentId, a['payment']['transactionGenerated'], "PROCESADO");
			}
		}
	};
	var url = urlBase + "/payment/cybersource/rest";
	xhttp.open("POST", url);
	xhttp.setRequestHeader("Content-Type", "application/json");
	xhttp.setRequestHeader("Accept", "application/json");
	const json = {
		"address": BaniPay.address,
		"administrativeArea": BaniPay.administrativeArea,
		"affiliate": BaniPay.affiliate,
		"amount": BaniPay.total,
		"authTransactionId": BaniPay.authTransactionId,
		"business": BaniPay.business,
		"city": BaniPay.city,
		"country": BaniPay.country,
		"csToken": "NO",
		"currency": BaniPay.currency,
		"cvv": "000",
		"description": BaniPay.description,
		"email": BaniPay.email,
		"expirationMonth": BaniPay.expMonth,
		"expirationYear": BaniPay.expYear,
		"firstname": BaniPay.firstName,
		"flexToken": BaniPay.flexResponse,
		"instrumentType": "flexToken",
		"lastname": BaniPay.lastName,
		"nit": BaniPay.documentNumber,
		"paymentId": BaniPay.bpPaymentId,
		"phoneNumber": BaniPay.phoneNumber,
		"postalCode": BaniPay.postalCode,
		"referenceId": BaniPay.referenceId,
		"referenceNumber": BaniPay.referenceNumber,
		"sessionId": BaniPay.sessionId,
		"transaction": "000",
		"transactionType": BaniPay.transactionType
	};
	xhttp.send(JSON.stringify(json));
}

function enrolPayment() {

	if (BaniPay.AcsUrl) {
		Cardinal.continue('cca', {
			"AcsUrl": BaniPay.AcsUrl,
			"Payload": BaniPay.Payload
		}, {
			"OrderDetails": {
				"OrderNumber": BaniPay.referenceNumber,
				"Amount": BaniPay.total,
				"CurrencyCode": BaniPay.currency,
				"TransactionId": BaniPay.authTransactionId
			},
			"ReferenceId": BaniPay.referenceId
		});
	} else {
		if (BaniPay.csStatus === null) {
			finalizar("CYBER_SOURCE", BaniPay.bpPaymentId, "", "ERROR DE PROCESAMIENTO DE TARJETA 500");
		} else {
			finalizar("CYBER_SOURCE", BaniPay.bpPaymentId, BaniPay.bpTransactionId, BaniPay.csStatus);
		}

	}


}

function confirmPayment() {
	BaniPay.transactionType = "consumerValidate";
	sendPaymentCS();
}


function parseBin(token) {
	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));

	var parsed = JSON.parse(jsonPayload);
	return parsed['content']['paymentInformation']['card']['number']['bin'];
}

function pagarCyberSource() {
	var payCyberSource = document.getElementById("payCyberSource");
	payCyberSource.classList.remove('hideInput');
	var paySimple = document.getElementById("paySimple");
	paySimple.classList.add('hideInput');
	BaniPay.referenceNumber = BaniPay.bpPaymentId;
	initializeFlex();
}

function listen_qr(externalId) {
	var idVar = setInterval(() => {
		escuchar(externalId);
	}, 5000);

	function escuchar(externalId) {
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4 && this.status == 200) {
				var a = xhttp.responseText;
				var datos = JSON.parse(a);
				BaniPay.paymentId = datos['paymentId'];
				if (datos['status'] == "PROCESADO") {
					concluir_qr();
					finalizar("SIMPLEQR", externalId, BaniPay.bcpId, "PROCESADO");
				}
			}
		};
		var url = "https://modal-flask-dev-q5zse.ondigitalocean.app/consultQR?id=" + externalId;
		xhttp.open("GET", url);
		xhttp.setRequestHeader("Access-Control-Allow-Origin", "*");
		xhttp.setRequestHeader("Accept", "application/json");
		xhttp.send();
	}

	function concluir_qr() {
		clearInterval(idVar);
	}
}

// Temporary fix
function workaroundSimple() {
	var urlSimpleFix = urlBase + '/qr-payment/business/' + BaniPay.business;
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var a = xhttp.responseText;
			var datos = JSON.parse(a);
			//			paySimple.classList.remove('hideInput');
			var qrCodeImage = document.getElementById("qrCodeImage");
			qrCodeImage.src = 'data:image/png;base64, ' + datos[0]['image'];
			BaniPay.qrImage = datos[0]['image'];
			BaniPay.paymentId = datos[0]['identifier'];
			BaniPay.bcpId = datos[0]['externalId'];
			BaniPay.bpPaymentId = datos[0]['id'];
			listen_qr(BaniPay.bcpId);
		}
	};
	xhttp.open("GET", urlSimpleFix);
	xhttp.setRequestHeader("Content-Type", "application/json");
	xhttp.setRequestHeader("Accept", "application/json");
	xhttp.send();

}




function pagarSimple() {
	if (BaniPay.environmentType == "Dev") {
		urlBase = "https://staging.banipay.me/api/pagos";
	} else {
		urlBase = "https://v2.banipay.me/api/pagos";
	}
	var payTigo = document.getElementById("payTigo");
	payTigo.classList.add('hideInput');
	var payCyberSource = document.getElementById("payCyberSource");
	payCyberSource.classList.add('hideInput');
	var paySimple = document.getElementById("paySimple");
	paySimple.classList.remove('hideInput');
	var urlSimple = urlBase + '/qr-payment/';
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			var a = xhttp.responseText;
			var datos = JSON.parse(a);
			paySimple.classList.remove('hideInput');
			var qrCodeImage = document.getElementById("qrCodeImage");
			qrCodeImage.src = 'data:image/png;base64, ' + datos['image'];
			BaniPay.qrImage = datos['image'];
			BaniPay.paymentId = datos['identifier'];
			BaniPay.bcpId = datos['externalId'];
			BaniPay.bpPaymentId = datos['id'];
			listen_qr(BaniPay.bcpId);
		}

		if (this.readyState == 4 && this.status == 500) {

			workaroundSimple();

		}
	};
	xhttp.open("POST", urlSimple);
	xhttp.setRequestHeader("Content-Type", "application/json");
	xhttp.setRequestHeader("Accept", "application/json");
	var json = {
		"paymentId": BaniPay.bpPaymentId,
		"gloss": BaniPay.description,
		"amount": BaniPay.total,
		"currency": BaniPay.currency,
		"singleUse": "true",
		"expiration": "0/00:05",
		"affiliate": BaniPay.affiliate,
		"business": BaniPay.business,
		"code": BaniPay.externalCode,
		"type": "Banipay",
		"idCommercial": BaniPay.commercialId
	};
	xhttp.send(JSON.stringify(json));
}

function pagarTigo() {

	document.getElementById("tigoNumber").value = document.getElementById('billing_phone').value;
	var payTigo = document.getElementById("payTigo");
	payTigo.classList.remove('hideInput');
	var payCyberSource = document.getElementById("payCyberSource");
	payCyberSource.classList.add('hideInput');
	var paySimple = document.getElementById("paySimple");
	paySimple.classList.add('hideInput');
	var paySoli = document.getElementById("paySoli");
	paySoli.classList.add('hideInput');
}


//currently with v1
function processTigo() {
	alert("En este momento no tiene habilitado pagos por Tigo.");
}

function pagarSoli() {
	document.getElementById("soliNumber").value = document.getElementById('billing_phone').value;
	var payTigo = document.getElementById("payTigo");
	payTigo.classList.add('hideInput');
	var paySoli = document.getElementById("paySoli");
	paySoli.classList.remove('hideInput');
	var payCyberSource = document.getElementById("payCyberSource");
	payCyberSource.classList.add('hideInput');
	var paySimple = document.getElementById("paySimple");
	paySimple.classList.add('hideInput');
}

function finalizar(paymentMethod, bpPaymentId, transactionGenerated, estadoFinal) {
	var paymentMethodsBP = document.getElementById("paymentMethodsBP");
	paymentMethodsBP.classList.remove('BP-active');
	var finalResultsBP = document.getElementById("finalResultsBP");
	finalResultsBP.classList.add('BP-active');
	var successUrl = BaniPay.redirectUrl + "&wcId=" + BaniPay.wcOrderId + "&bpTrans=" + transactionGenerated + "&mdp=" + paymentMethod + "&bpId=" + bpPaymentId + "&env=" + BaniPay.environmentType;




	var finalResults = document.getElementById("finalResults");
	if (estadoFinal == "PROCESADO") {
		finalResults.innerHTML =
			'<div class="correctTransaction">				<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">					<circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none" />				<path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" /> </svg></div><h3>Pago Exitoso</h3><br><p>En 10 segundos será redirigido al sitio web de ' + BaniPay.description + '. <br><a id="bpRedirect" href="' + successUrl + '" target="_self">También puedes hacer click aquí para ir inmediatamente al sitio web.</a></p>';

		if (BaniPay.platform == "wordpress") {
			setTimeout(function() {
				document.getElementById("bpRedirect").click();
			}, 2000);

			document.getElementById("bpRedirect").click();


		}

	} else {
		finalResults.innerHTML =
			' <div class="errorTransaction">					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" class="cross">					<circle class="cross__circle" cx="26" cy="26" r="25" fill="none"/>					<path class="checkmark__check" fill="none" d="M16 16 36 36 M36 16 16 36" /> </svg></div><h3>Error de Pago</h3>	<br> <p>El código de error es: ' + estadoFinal + '</p><p>Puedes pagar en el siguiente enlace de pago: <br><a target="_blank" href="' + BaniPay.bpPaymentLink + '">' + BaniPay.bpPaymentLink + '</a><br>Si quieres volver a intentar puedes hacer click <a href="javascript:window.location.reload();">aquí.</a></p>';
	}




}





function downloadQR() {


	var link = document.createElement('a');

	link.href = 'data:application/octet-stream;base64,' + BaniPay.qrImage;
	link.download = 'qrBaniPay.png';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);


}



function closeBanipay() {
	document.querySelector('#banipayProcess').style.display = "none";
}


function initializeBP() {
	var link = document.createElement("link");
	link.href = "https://modal-flask-dev-q5zse.ondigitalocean.app/static/css/style.min.css";
	link.type = "text/css";
	link.rel = "stylesheet";
	link.media = "screen,print";
	//    document.getElementsByTagName("head")[0].appendChild(link);

	var script = document.createElement('script');
	script.src = "https://modal-flask-dev-q5zse.ondigitalocean.app/static/js/flex-microform.min.js";
	document.getElementsByTagName("head")[0].appendChild(script);
	var script1 = document.createElement('script');
	script1.src = "https://modal-flask-dev-q5zse.ondigitalocean.app/static/js/iso3166.js";
	document.getElementsByTagName("head")[0].appendChild(script1);
	var script2 = document.createElement('script');

	if (BaniPay.environmentType == "Dev") {
		script2.src =
			"https://songbirdstag.cardinalcommerce.com/cardinalcruise/v1/songbird.js";
	} else {

		script2.src =
			"https://songbird.cardinalcommerce.com/cardinalcruise/v1/songbird.js";
	}


	document.getElementsByTagName("head")[0].appendChild(script2);
	var meta = document.createElement("meta");
	meta.name = "viewport";
	meta.content = "width=device-width, initial-scale=1";
	document.getElementsByTagName("head")[0].appendChild(meta);
	var modal = document.createElement("div");
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			modal.innerHTML = xhttp.responseText;
			document.getElementsByTagName("body")[0].appendChild(modal);
		}
	};
	var url = 'https://modal-flask-dev-q5zse.ondigitalocean.app/banipayModal';
	xhttp.open("GET", url);
	xhttp.send();
}


function startBanipay() {
	main_form = document.querySelectorAll(".bp-main");
	var banipayProcess = document.getElementById("banipayProcess");
	banipayProcess.style.display = 'block';
	var detallesCompra = document.getElementById("detallesCompra");

	detallesCompra.innerHTML = '<div class="product"> <div class="description"><h4 id="descriptionProduct">' +
		BaniPay.description + '</h4><h5 id="totalPrice">' + BaniPay.total +
		' ' + BaniPay.currency +
		'</h5></div></div>';

	if (BaniPay.disabled.includes("TIGO_MONEY")) {
		document.querySelector('#radio-button-tigo').disabled = true;
		document.querySelector('.radio-button-tigo').classList.add('radio-button-disabled');
	}
	if (BaniPay.disabled.includes("CYBER_SOURCE")) {
		document.querySelector('#radio-button-cs').disabled = true;
		document.querySelector('#radio-button-cs').classList.add('radio-button-disabled');
	}
	if (BaniPay.disabled.includes("SOLI")) {
		document.querySelector('#radio-button-soli').disabled = true;
		document.querySelector('.radio-button-soli').classList.add('radio-button-disabled');
	}
	if (BaniPay.disabled.includes("SIMPLEQR")) {
		document.querySelector('#radio-button-qr').disabled = true;
		document.querySelector('.radio-button-qr').classList.add('radio-button-disabled');
	}

}

function startBanipayWC(orderId, redirectUrl) {
	BaniPay.externalCode = orderId;
	BaniPay.wcOrderId = orderId;
	BaniPay.redirectUrl = redirectUrl;
	startBanipay();
}
