const { test, expect, devices } = require('@playwright/test');
const BASE=process.env.BABA_TEST_URL||'http://127.0.0.1:4173/';
for(const [name,device] of [['iPhone 13',devices['iPhone 13']],['Pixel 7',devices['Pixel 7']],['iPad Mini',devices['iPad Mini']],['Desktop Chrome',{viewport:{width:1440,height:900}}]]){
 test.describe(name,()=>{
  const {defaultBrowserType, browserName, ...emulation}=device;
  test.use({...emulation});
  test.beforeEach(async({page})=>{
   await page.addInitScript(()=>sessionStorage.setItem('baba_ok','1'));
  });
  test('loads navigation, opens four pages, and has no horizontal overflow',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(BASE,{waitUntil:'domcontentloaded'});
   for(const id of ['gundem','lab','play','akis']){
    await page.goto(BASE+'#'+id,{waitUntil:'domcontentloaded'});
    await expect(page.locator('.bb-feature.bb-'+id)).toBeVisible({timeout:15000});
    await expect(page.locator('.bb-feature.bb-'+id+' .display')).toBeVisible();
    const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
    expect(dimensions.scroll,'overflow on '+id+': '+JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width+3);
   }
   expect(errors,'JavaScript page errors').toEqual([]);
  });
  test('quick navigation and page share control work',async({page})=>{
   await page.goto(BASE+'#play');
   await expect(page.locator('.bb-play')).toBeVisible();
   await page.keyboard.press('Control+k');
   await expect(page.locator('.bb-quick-dialog')).toBeVisible();
   await page.locator('.bb-quick-dialog input').fill('LAB');
   await expect(page.locator('.bb-quick-results a[href="#lab"]')).toBeVisible();
   await page.keyboard.press('Enter');
   await expect(page.locator('.bb-lab')).toBeVisible();
   await expect(page.locator('#babaSharedActions .baba-shared-trigger')).toBeVisible();
  });
  test('PLAY saves and filters a local item',async({page})=>{
   await page.goto(BASE+'#play');
   await expect(page.locator('#playForm')).toBeVisible();
   await page.locator('#playForm [name=title]').fill('Mobil test içeriği');
   await page.locator('#playForm button[type=submit]').click();
   await expect(page.locator('.bb-feed-post').filter({hasText:'Mobil test içeriği'})).toBeVisible();
  });
  test('AKIŞ saves a local post',async({page})=>{
   await page.goto(BASE+'#akis');
   await expect(page.locator('#akisForm')).toBeVisible();
   await page.locator('#akisForm [name=text]').fill('Mobil test paylaşımı');
   await page.locator('#akisForm button[type=submit]').click();
   await expect(page.locator('.bb-feed-post').filter({hasText:'Mobil test paylaşımı'})).toBeVisible();
  });
 });
}

test.describe('BABA. new daily experience',()=>{
 test.use({viewport:{width:390,height:844}});
 test.beforeEach(async({page})=>await page.addInitScript(()=>sessionStorage.setItem('baba_ok','1')));
 test('TODAY and mobile nav appear without overflow',async({page})=>{
  await page.goto(BASE+'#today');
  await expect(page.locator('.bb-today h1')).toBeVisible();
  await expect(page.locator('#bbMobileNav')).toBeVisible();
  await expect(page.locator('#bbMobileNav a[href="#backup"]')).toBeVisible();
  const d=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
  expect(d[0]).toBeLessThanOrEqual(d[1]+3);
 });
 test('BACKUP export and safe import UI',async({page})=>{
  await page.goto(BASE+'#backup');
  await expect(page.locator('#bbExport')).toBeVisible();
  await expect(page.locator('#bbImport')).toBeAttached();
 });
 test('shared actions menu replaces repeated buttons',async({page})=>{
  await page.goto(BASE+'#lab');
  await expect(page.locator('.bb-lab')).toBeVisible();
  await page.locator('.baba-shared-trigger').click();
  await expect(page.locator('.baba-shared-menu button')).toHaveCount(2);
  await expect(page.locator('.bb-lab .baba-actions')).toHaveCount(0);
 });
});

test.describe('Consolidated category navigation',()=>{
 test.use({viewport:{width:390,height:844}});
 test.beforeEach(async({page})=>page.addInitScript(()=>sessionStorage.setItem('baba_ok','1')));
 for(const [route,links] of [['kesfet',['gundem','akis','play']],['hayat',['seyahat','foto']],['sosyal',['msn','dost']]]){
  test(route+' shows preserved legacy destinations',async({page})=>{
   await page.goto(BASE+'#'+route);
   await expect(page.locator('.bb-group-page')).toBeVisible();
   for(const id of links)await expect(page.locator('.bb-group-card[href="#'+id+'"]')).toBeVisible();
   const d=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
   expect(d[0]).toBeLessThanOrEqual(d[1]+3);
  });
 }
 test('home displays grouped categories instead of duplicated tiles',async({page})=>{
  await page.goto(BASE);
  await expect(page.locator('.hub-card[href="#kesfet"]')).toBeVisible();
  await expect(page.locator('.hub-card[href="#hayat"]')).toBeVisible();
  await expect(page.locator('.hub-card[href="#sosyal"]')).toBeVisible();
  await expect(page.locator('.hub-card[href="#gundem"]')).toHaveCount(0);
  await expect(page.locator('.hub-card[href="#lab"]')).toHaveCount(0);
 });
 test('legacy routes remain available and data modules load',async({page})=>{
  for(const [route,selector] of [['gundem','.bb-gundem'],['akis','.bb-akis'],['play','.bb-play'],['lab','.bb-lab']]){
   await page.goto(BASE+'#'+route);
   await expect(page.locator(selector)).toBeVisible();
  }
 });
});
