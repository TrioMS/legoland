import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Android ana ekran simgesi (maskable) ve Apple simgesi kenar boşluğunu beyaz değil turuncu doldursun
const TURUNCU = '#ff5a1f';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: TURUNCU } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: TURUNCU } },
  },
  images: ['public/favicon.svg'],
});
