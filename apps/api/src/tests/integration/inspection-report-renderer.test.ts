import { describe,expect,it } from 'vitest';
import { buildOfficialReportHtml,escapeHtml } from '../../modules/inspection-reviews/report-template.js';
import { renderPdf } from '../../modules/inspection-reviews/report-renderer.js';

describe('controlled official report renderer',()=>{
  it('escapes every dynamic HTML boundary and renders a valid PDF',async()=>{
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
    const hostile='<img src=x onerror=alert(1)>';
    const html=buildOfficialReportHtml({verificationId:'123',generatedAt:new Date(0).toISOString(),case:{id:'case',origin:hostile},inspection:{id:'inspection',date:'date',evaluator:hostile,approver:'Approver',bpmTemplate:'BPM',riskRule:'Risk'},calculation:{bpmPercentage:100,productRiskScore:1,establishmentRiskScore:1,totalRiskScore:1,frequency:'ANNUAL'},bpm:[{code:hostile,value:'C',applicable:true}],factors:[],evidence:[],history:[]});
    expect(html).not.toContain(hostile);expect(html).not.toMatch(/https?:\/\//);
    const pdf=await renderPdf(html);expect(pdf.subarray(0,5).toString()).toBe('%PDF-');expect(pdf.length).toBeGreaterThan(500);
  },30000);
});
