/**
 * OpenQRIS Embeddable Modal Widget
 * Memungkinkan SaaS mitra membuka modal checkout langsung di halaman mereka
 */
(function (window) {
  var OpenQRIS = {
    pay: function (options) {
      if (!options || !options.chargeId) {
        console.error('[OpenQRIS] chargeId wajib disertakan.');
        return;
      }

      var host = options.host || window.location.origin;
      var checkoutUrl = host + '/checkout/' + options.chargeId;

      // 1. Buat Container Overlay
      var overlay = document.createElement('div');
      overlay.id = 'openqris-modal-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
      overlay.style.backdropFilter = 'blur(6px)';
      overlay.style.webkitBackdropFilter = 'blur(6px)';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.25s ease';

      // 2. Buat Modal Box
      var modal = document.createElement('div');
      modal.style.position = 'relative';
      modal.style.width = '100%';
      modal.style.maxWidth = '780px';
      modal.style.height = '620px';
      modal.style.maxHeight = '90vh';
      modal.style.borderRadius = '20px';
      modal.style.overflow = 'hidden';
      modal.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.7)';
      modal.style.transform = 'scale(0.95)';
      modal.style.transition = 'transform 0.25s ease';

      // 3. Tombol Tutup
      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '16px';
      closeBtn.style.right = '16px';
      closeBtn.style.width = '36px';
      closeBtn.style.height = '36px';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      closeBtn.style.border = 'none';
      closeBtn.style.color = '#ffffff';
      closeBtn.style.fontSize = '18px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.zIndex = '10';

      var destroy = function () {
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 250);
        if (typeof options.onClose === 'function') {
          options.onClose();
        }
      };

      closeBtn.onclick = destroy;
      overlay.onclick = function (e) {
        if (e.target === overlay) destroy();
      };

      // 4. Iframe Checkout
      var iframe = document.createElement('iframe');
      iframe.src = checkoutUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';

      modal.appendChild(closeBtn);
      modal.appendChild(iframe);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Trigger animasi masuk
      requestAnimationFrame(function () {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
      });

      return {
        close: destroy,
      };
    },
  };

  window.OpenQRIS = OpenQRIS;
})(window);
