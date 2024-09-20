import { chromium, Browser, Page, BrowserContext } from "playwright";
import * as fs from "fs";

async function getOrderIds(page: Page): Promise<string[]> {
  const orderIdContainers = await page.$$("div.yohtmlc-order-id");
  const orderIds: string[] = [];

  for (const container of orderIdContainers) {
    const span = await container.$("span[dir='ltr']");
    if (span) {
      const orderId = await span.innerText();
      orderIds.push(orderId);
    }
  }

  return orderIds;
}

async function saveAuthState(page: Page) {
  if (!fs.existsSync("playwright")) fs.mkdirSync("playwright");
  if (!fs.existsSync("playwright/.auth")) fs.mkdirSync("playwright/.auth");
  await page
    .context()
    .storageState({ path: "playwright/.auth/auth_state.json" });
}

async function useSavedAuthState(browser: Browser): Promise<BrowserContext> {
  if (fs.existsSync("playwright/.auth/auth_state.json")) {
    console.log("Using saved auth state");
    return browser.newContext({
      storageState: "playwright/.auth/auth_state.json",
    });
  } else {
    return browser.newContext();
  }
}

async function awaitUserAuthentication(
  page: Page,
  url: string,
  shouldSaveAuthState = false,
  logged_out_urls: string[] = []
) {
  await page.goto(url);

  function isLoggedOutPage(page: Page) {
    return logged_out_urls.some((logged_out_url) =>
      page.url().includes(logged_out_url)
    );
  }

  while (isLoggedOutPage(page)) {
    console.log("Logged out page detected: ", page.url());
    await page.waitForEvent("framenavigated", { timeout: 0 });
  }

  if (shouldSaveAuthState) {
    await saveAuthState(page);
  }
}

async function main(year: number) {
  const browser = await chromium.launch({ headless: false });
  const context = await useSavedAuthState(browser);
  const page = await context.newPage();

  await awaitUserAuthentication(
    page,
    `https://www.amazon.com/your-orders/orders?timeFilter=year-2024&ref_=ppx_yo2ov_dt_b_filter_all_y${year}`,
    true,
    ["https://www.amazon.com/ap/signin", "https://www.amazon.com/ap/mfa"]
  );

  await page.waitForLoadState("domcontentloaded", { timeout: 10000 });

  const orderIds: string[] = [];

  while (true) {
    orderIds.push(...(await getOrderIds(page)));
    const nextPageButton = await page.$("li.a-last");
    const isDisabled = await nextPageButton?.evaluate((el) =>
      el.classList.contains("a-disabled")
    );
    if (isDisabled) {
      break;
    } else {
      await page.click("li.a-last");
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  }

  if (!fs.existsSync("invoices")) fs.mkdirSync("invoices");

  for (let i = 0; i < orderIds.length; i++) {
    const orderId = orderIds[i];
    const url = `https://www.amazon.com/gp/css/summary/print.html?orderID=${orderId}&ref=ppx_yo2ov_dt_b_invoice`;
    await page.goto(url);
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    await page.emulateMedia({ media: "print" });
    await page.pdf({ path: `invoices/invoice_${i}.pdf` });
  }

  await browser.close();

  console.log("Finished downloading invoices");
}

main(2024);
