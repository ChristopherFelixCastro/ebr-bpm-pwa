import { describe,expect,it } from 'vitest';
import { buildDraftReportHtml,buildOfficialReportHtml,escapeHtml } from '../../modules/inspection-reviews/report-template.js';
import { renderPdf } from '../../modules/inspection-reviews/report-renderer.js';

describe('controlled official report renderer',()=>{
  it('distingue el borrador del informe oficial en el contenido',()=>{
    const data={verificationId:'123',generatedAt:new Date(0).toISOString(),case:{id:'case',origin:'Institucional'},inspection:{id:'inspection',date:'date',evaluator:'Evaluador',approver:'Coordinador',bpmTemplate:'BPM',riskRule:'Riesgo'},calculation:{bpmPercentage:80,productRiskScore:1,establishmentRiskScore:2,totalRiskScore:2,frequency:'ANNUAL'},bpm:[],factors:[],evidence:[],history:[],narrative:{executiveSummary:'Resumen de prueba',additionalFindings:'',recommendations:'Recomendación de prueba'},contentVersion:1};
    const draft=buildDraftReportHtml(data),official=buildOfficialReportHtml(data);
    expect(draft).toContain('Informe no oficial');expect(draft).toContain('class="watermark"');expect(draft).not.toContain('Espacios para firma');
    expect(official).toContain('<h1>Informe oficial</h1>');expect(official).toContain('Espacios para firma');expect(official).toContain('Firma del evaluador');expect(official).not.toContain('class="watermark"');
    expect(draft).toContain('data:image/jpeg;base64,');expect(official).toContain('#78350f');expect(official).toContain('Cumplimiento BPM');
  });
  it('escapes every dynamic HTML boundary and renders a valid PDF',async()=>{
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
    const hostile='<img src=x onerror=alert(1)>';
    const data={verificationId:'123',generatedAt:new Date(0).toISOString(),case:{id:'case',origin:hostile},inspection:{id:'inspection',date:'date',evaluator:hostile,approver:'Approver',bpmTemplate:'BPM',riskRule:'Risk'},calculation:{bpmPercentage:100,productRiskScore:1,establishmentRiskScore:1,totalRiskScore:1,frequency:'ANNUAL'},bpm:[{code:hostile,value:'C',applicable:true}],factors:[],evidence:[],history:[],narrative:{executiveSummary:hostile,additionalFindings:'',recommendations:'Revisar'},contentVersion:1};
    const html=buildOfficialReportHtml(data),draft=buildDraftReportHtml(data);
    expect(html).not.toContain(hostile);expect(html).not.toMatch(/https?:\/\//);
    expect(draft).toContain('Informe no oficial');expect(draft).toContain('watermark');expect(draft).not.toContain('Espacios para firma');
    expect(html).toContain('Espacios para firma');expect(html).toContain('Firma del evaluador');expect(html).not.toContain('watermark"');
    const pdf=await renderPdf(html);expect(pdf.subarray(0,5).toString()).toBe('%PDF-');expect(pdf.length).toBeGreaterThan(500);
  },30000);
});
