import type { MocOnerisi } from '../shared/tipler';

const GUN = 24 * 60 * 60;

/** Bir resmi setin parçalarıyla yapılabilen hayran tasarımları (MOC). Sonuç bir gün önbellekte tutulur. */
export async function setAlternatifleri(setNo: string, anahtar: string): Promise<MocOnerisi[]> {
  const url = `https://rebrickable.com/api/v3/lego/sets/${encodeURIComponent(setNo)}/alternates/?page_size=12`;
  const onbellek = caches.default;
  const onbellekAnahtari = new Request(`https://onbellek.legoland/moc/${encodeURIComponent(setNo)}`);

  let yanit = await onbellek.match(onbellekAnahtari);
  if (!yanit) {
    const cevap = await fetch(url, { headers: { Authorization: `key ${anahtar}`, Accept: 'application/json' } });
    if (cevap.status === 404) return [];
    if (!cevap.ok) {
      console.error('Rebrickable hatası', cevap.status, await cevap.text().catch(() => ''));
      throw new Error(`Rebrickable ${cevap.status}`);
    }
    yanit = new Response(await cevap.text(), {
      headers: { 'content-type': 'application/json', 'cache-control': `max-age=${GUN}` },
    });
    await onbellek.put(onbellekAnahtari, yanit.clone());
  }

  const veri = (await yanit.json()) as { results?: any[] };
  return (veri.results ?? []).map((m) => ({
    no: String(m.set_num),
    ad: String(m.name),
    parcaSayisi: Number(m.num_parts) || 0,
    resim: String(m.moc_img_url ?? ''),
    link: String(m.moc_url ?? `https://rebrickable.com/mocs/${m.set_num}/`),
    tasarimci: m.designer_name ? String(m.designer_name) : undefined,
  }));
}
