import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { Galeri } from './ekranlar/Galeri';
import './stil.css';

// Yeni sürüm yayınlanınca otomatik yüklenir. Uygulama açıkken saatte bir
// ve uygulamaya her geri dönüldüğünde güncelleme kontrol edilir.
registerSW({
  immediate: true,
  onRegisteredSW(_url, kayit) {
    if (!kayit) return;
    const kontrol = () => kayit.update().catch(() => {});
    setInterval(kontrol, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') kontrol();
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.DEV && location.search.includes('galeri') ? <Galeri /> : <App />}
  </StrictMode>,
);
