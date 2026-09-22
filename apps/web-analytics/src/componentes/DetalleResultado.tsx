import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { CalculationResult } from '@ebr-bpm/risk-engine';
import { RiesgoChip } from './EstadoChip';

export function DetalleResultado({ resultado }: { resultado: CalculationResult }) {
  if (resultado.status === 'NO_CALCULABLE') {
    return (
      <Card>
        <CardContent>
          <Typography variant="h3" gutterBottom>Resultado no calculable</Typography>
          <Typography color="text.secondary">{resultado.reasons.join(', ')}</Typography>
        </CardContent>
      </Card>
    );
  }

  const valores = [
    ['Cumplimiento BPM', `${resultado.bpmPercentage.display} %`],
    ['Riesgo del producto', resultado.productRisk.display],
    ['Riesgo del establecimiento', resultado.establishmentRisk.display],
    ['Riesgo total', resultado.totalRisk.display],
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h2">Resultado de la evaluación</Typography>
              <Typography color="text.secondary">Frecuencia {resultado.frequency.toLocaleLowerCase('es')} · próxima inspección en {resultado.frequencyMonths} meses</Typography>
            </Box>
            <RiesgoChip nivel={resultado.riskLevel} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            {valores.map(([etiqueta, valor]) => (
              <Box key={etiqueta} sx={{ p: 2, bgcolor: '#f4f7f8', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">{etiqueta}</Typography>
                <Typography sx={{ fontSize: '1.45rem', fontWeight: 760 }}>{valor}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
          <Box>
            <Typography fontWeight={750}>Cómo se calculó</Typography>
            <Typography variant="body2" color="text.secondary">Desglose auditable de reglas, factores y versiones</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="h3" gutterBottom>Cumplimiento BPM</Typography>
          <Typography color="text.secondary" paragraph>
            {resultado.explanation.bpm.pointsObtained} puntos obtenidos de {resultado.explanation.bpm.pointsPossible} posibles. Se excluyeron {resultado.explanation.bpm.excludedItems.length} ítems No aplica.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h3" gutterBottom>Riesgo del establecimiento</Typography>
          <TableContainer>
            <Table size="small" aria-label="Factores del riesgo del establecimiento">
              <TableHead>
                <TableRow>
                  <TableCell>Factor</TableCell>
                  <TableCell>Tramo u opción</TableCell>
                  <TableCell align="right">Puntos</TableCell>
                  <TableCell align="right">Peso</TableCell>
                  <TableCell align="right">Aporte</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultado.explanation.establishment.factors.map((factor) => (
                  <TableRow key={factor.code}>
                    <TableCell>{factor.name}</TableCell>
                    <TableCell>{factor.selected?.label ?? 'Sin valor'}</TableCell>
                    <TableCell align="right">{factor.points ?? '—'}</TableCell>
                    <TableCell align="right">{factor.weight}</TableCell>
                    <TableCell align="right">{factor.contribution ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Motor {resultado.engineVersion} · Regla {resultado.ruleVersion.version} · Plantilla BPM {resultado.bpmTemplateVersionId} · Catálogo {resultado.foodCatalogVersionId}. {resultado.explanation.rounding.note}
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
