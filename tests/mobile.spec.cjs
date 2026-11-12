const { test, expect, devices } = require('@playwright/test');
const BASE='https://oguzcobn.github.io/baba./';
for(const [name,device] of [['iPhone 13',devices['iPhone 13']],['Pixel 7',devices['Pixel 7']],['iPad Mini',devices['iPad Mini']],['Desktop Chrome',{viewport:{width:1440,height:900}}]]){
 test.describe(name,()=>{
  test.use({...device});
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
   await expect(page.locator('.bb-lab .baba-actions button').first()).toBeVisible();
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
