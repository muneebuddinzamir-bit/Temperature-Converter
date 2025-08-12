/* script.js
   Uses W3Schools TemperatureConvert SOAP service.
   NOTE: Browser CORS may block direct calls — see SERVICE_URL and proxy instructions below.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Elements (IDs match your earlier app)
  const tempInput = document.getElementById('tempInput');
  const convertBtn = document.getElementById('convertBtn');
  const clearBtn = document.getElementById('clearBtn');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('errorMessage');
  const resultCard = document.getElementById('resultCard');
  const resultValue = document.getElementById('resultValue');
  const resultMeta = document.getElementById('resultMeta');
  const useProxyCheckbox = document.getElementById('useProxy');

  // SOAP endpoint (W3Schools)
  const RAW_SERVICE = 'https://www.w3schools.com/xml/tempconvert.asmx';
  // Public CORS proxy for quick testing (can be removed):
  const PUBLIC_PROXY = 'https://cors-anywhere.herokuapp.com/';

  // Build SOAP envelope
  function buildEnvelope(methodName, paramName, paramValue) {
    return `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                     xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <${methodName} xmlns="https://www.w3schools.com/xml/">
            <${paramName}>${paramValue}</${paramName}>
          </${methodName}>
        </soap:Body>
      </soap:Envelope>`;
  }

  // Generic SOAP fetch helper
  async function soapFetch(methodName, paramName, paramValue, useProxy = true) {
    const serviceUrl = (useProxy ? PUBLIC_PROXY : '') + RAW_SERVICE;
    const soapAction = `https://www.w3schools.com/xml/${methodName}`;

    const body = buildEnvelope(methodName, paramName, paramValue);

    const res = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction
      },
      body
    });

    if (!res.ok) {
      const txt = await res.text().catch(()=>res.statusText);
      throw new Error(`Network error: ${res.status} ${txt}`);
    }

    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    return xml;
  }

  // Find result node robustly (handles namespaces)
  function extractResult(xmlDoc, resultLocalName) {
    // try direct tag
    const direct = xmlDoc.getElementsByTagName(resultLocalName)[0];
    if (direct && direct.textContent) return direct.textContent;

    // fallback: search any element whose localName endsWith 'Result'
    const all = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (el.localName === resultLocalName || (el.localName && el.localName.endsWith('Result'))) {
        if (el.textContent) return el.textContent;
      }
    }
    return null;
  }

  // UI helpers
  function showLoading(show = true) {
    loadingEl.style.display = show ? 'flex' : 'none';
  }
  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    resultCard.style.display = 'none';
  }
  function clearError() {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

  async function convertCtoF(celsius, useProxy=true) {
    const xml = await soapFetch('CelsiusToFahrenheit', 'Celsius', celsius, useProxy);
    const res = extractResult(xml, 'CelsiusToFahrenheitResult');
    return res;
  }

  async function convertFtoC(fahrenheit, useProxy=true) {
    const xml = await soapFetch('FahrenheitToCelsius', 'Fahrenheit', fahrenheit, useProxy);
    const res = extractResult(xml, 'FahrenheitToCelsiusResult');
    return res;
  }

  // Event handlers
  convertBtn.addEventListener('click', async () => {
    clearError();
    resultCard.style.display = 'none';

    const val = tempInput.value.trim();
    if (!val) { showError('Please enter a temperature value.'); return; }

    // validate numeric input (allow decimals and leading +/-, but not stray letters)
    if (!/^[-+]?\d+(\.\d+)?$/.test(val)) {
      showError('Enter a valid number (e.g. 36.6 or -10).');
      return;
    }

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const useProxy = useProxyCheckbox.checked;

    try {
      showLoading(true);
      let result;
      if (mode === 'CtoF') {
        result = await convertCtoF(val, useProxy);
        resultValue.textContent = result ? `${result} °F` : '—';
        resultMeta.textContent = `${val} °C → ${result ? result + ' °F' : '—'}`;
      } else {
        result = await convertFtoC(val, useProxy);
        resultValue.textContent = result ? `${result} °C` : '—';
        resultMeta.textContent = `${val} °F → ${result ? result + ' °C' : '—'}`;
      }
      resultCard.style.display = 'block';
    } catch (err) {
      console.error(err);
      showError('Conversion failed — ' + (err.message || 'Unknown error'));
    } finally {
      showLoading(false);
    }
  });

  clearBtn.addEventListener('click', () => {
    tempInput.value = '';
    resultCard.style.display = 'none';
    clearError();
  });

  // optional: allow Enter key on input
  tempInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') convertBtn.click();
  });
});
