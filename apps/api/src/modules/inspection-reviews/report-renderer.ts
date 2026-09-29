import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { env } from '../../config/env.js';

const windowsEdge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
export async function renderPdf(html:string):Promise<Buffer>{
  const executablePath=env.PDF_CHROMIUM_EXECUTABLE_PATH||(existsSync(windowsEdge)?windowsEdge:undefined);
  if(!executablePath)throw new Error('PDF_CHROMIUM_NOT_CONFIGURED');
  const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-extensions']});
  try{const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',request=>request.url()==='about:blank'||request.url().startsWith('data:')?request.continue():request.abort());await page.setContent(html,{waitUntil:'domcontentloaded'});const bytes=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});return Buffer.from(bytes)}finally{await browser.close()}
}
