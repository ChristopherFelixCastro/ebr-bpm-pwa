import { Box, Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export function StatusPage({ title, description }: { title: string; description?: string }) {
  return <Box sx={{ p: 3, maxWidth: 650 }}>
    <Typography variant="h4" sx={{ mb: 2 }}>{title}</Typography>
    {description && <Typography sx={{ mb: 2 }}>{description}</Typography>}
    {description && <Button component={Link} to="/inicio">Ir al inicio</Button>}
  </Box>
}
