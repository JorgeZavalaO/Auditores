(() => {
  const form = document.querySelector('#diagnostic-form');
  const status = document.querySelector('#form-status');
  if (!form || !status || form.dataset.contactMode !== 'live') return;
  const button = form.querySelector('button[type="submit"]');
  let token = '', widget, busy = false, signature = '', requestId = '';
  const ready = (value = '') => { token = value; button.disabled = busy || !token; };
  window.jjContactReady = () => {
    widget = window.turnstile.render('#contact-verification', {
      sitekey: form.dataset.sitekey, action: 'contact', language: 'es',
      callback: (value) => ready(value),
      'expired-callback': () => ready(),
      'error-callback': () => { ready(); status.textContent = 'No se pudo completar la verificación. Recargue la página o use el correo de contacto.'; },
    });
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !token || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    delete data['cf-turnstile-response'];
    const current = JSON.stringify(data);
    if (signature !== current) { signature = current; requestId = crypto.randomUUID(); }
    const controls = Array.from(form.elements).map((control) => [control, control.disabled]);
    busy = true;
    controls.forEach(([control]) => { control.disabled = true; });
    status.textContent = 'Enviando solicitud…';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ ...data, token, requestId }),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        status.textContent = result.code === 'limited'
          ? 'Se recibieron varias solicitudes. Espere un minuto antes de volver a intentar.'
          : 'No pudimos confirmar el envío. Revise los datos y vuelva a verificar, o escriba al correo de contacto.';
      } else {
        status.textContent = 'Solicitud aceptada para envío. Gracias por contactar con J&J.';
        form.reset(); signature = ''; requestId = '';
      }
    } catch {
      status.textContent = 'No pudimos confirmar el envío. Puede volver a verificar e intentar, o escribir al correo de contacto.';
    } finally {
      busy = false;
      controls.forEach(([control, disabled]) => { control.disabled = disabled; });
      ready();
      window.turnstile.reset(widget);
    }
  });
})();
