import { Box, Paper } from '@mui/material'

interface PlaceholderPageProps {
  title: string
  description: string
}

function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <Box>
      <Box
        component="h1"
        sx={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#451a03',
          mt: 0,
          mb: 1,
        }}
      >
        {title}
      </Box>

      <Box
        component="p"
        sx={{
          color: '#92400e',
          mt: 0,
          mb: 4,
        }}
      >
        {description}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '1px solid #fde68a',
          borderRadius: 3,
          bgcolor: '#ffffff',
        }}
      >
        <Box
          component="p"
          sx={{
            m: 0,
            color: '#526174',
          }}
        >
          Módulo preparado para continuar su implementación.
        </Box>
      </Paper>
    </Box>
  )
}

export default PlaceholderPage