import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  MenuItem,
  CircularProgress,
  Tooltip,
  TablePagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import type { Company } from '../../types';

export const CompanyListPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole, activeCompanyId } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('ALL');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // New Company Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    legalName: '',
    rnc: '',
    tradeName: '',
    address: '',
    municipality: '',
    province: 'Santiago',
    economicActivity: '',
    email: '',
    phone: '',
    active: true,
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCompanies();
      if (currentRole === 'ADMIN_EMPRESA' || currentRole === 'DELEGADO') {
        const filtered = data.filter((c) => c.id === activeCompanyId);
        setCompanies(filtered.length > 0 ? filtered : [data[0]]);
      } else {
        setCompanies(data);
      }
    } catch {
      showError('Error al cargar el listado de empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [currentRole, activeCompanyId]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legalName.trim() || !formData.rnc.trim() || !formData.email.trim()) {
      showError('Por favor complete los campos obligatorios (*)');
      return;
    }

    try {
      setSaving(true);
      const created = await apiService.createCompany(formData);
      showSuccess(`Empresa "${created.legalName}" registrada exitosamente`);
      setModalOpen(false);
      setFormData({
        legalName: '',
        rnc: '',
        tradeName: '',
        address: '',
        municipality: '',
        province: 'Santiago',
        economicActivity: '',
        email: '',
        phone: '',
        active: true,
      });
      await fetchCompanies();
    } catch (err: any) {
      showError(err.message || 'Error al registrar la empresa');
    } finally {
      setSaving(false);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.rnc.includes(searchTerm) ||
      c.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.municipality.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvince = provinceFilter === 'ALL' || c.province === provinceFilter;

    return matchesSearch && matchesProvince;
  });

  const paginatedCompanies = filteredCompanies.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Header section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <BusinessIcon sx={{ color: '#1E3A8A', fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Catálogo de Empresas y Establecimientos
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Administre la personería jurídica, sedes de producción físicas y contactos clave de manufactura.
          </Typography>
        </Box>

        {currentRole === 'ADMINISTRADOR' && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
            sx={{
              backgroundColor: '#1E3A8A',
              '&:hover': { backgroundColor: '#1E40AF' },
              px: 2.5,
              py: 1,
            }}
          >
            Crear Empresa
          </Button>
        )}
      </Box>

      {/* CRUD Container Card: Fondo #FFFFFF con borde en #E2E8F0 */}
      <Card sx={{ borderRadius: 2, border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
        {/* Filters and search toolbar */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { md: 'center' },
            gap: 2,
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <TextField
            placeholder="Buscar por Razón Social, RNC, Nombre Comercial o Municipio..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: { xs: '100%', md: 420 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94A3B8' }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
              Provincia:
            </Typography>
            <TextField
              select
              size="small"
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              sx={{ width: 170 }}
            >
              <MenuItem value="ALL">Todas las Provincias</MenuItem>
              <MenuItem value="Santiago">Santiago</MenuItem>
              <MenuItem value="San Cristóbal">San Cristóbal</MenuItem>
              <MenuItem value="Duarte">Duarte</MenuItem>
              <MenuItem value="Santo Domingo">Santo Domingo</MenuItem>
            </TextField>
          </Box>
        </Box>

        {/* Data Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Razón Social / Empresa</TableCell>
                <TableCell>RNC / Identificación</TableCell>
                <TableCell>Ubicación y Provincia</TableCell>
                <TableCell>Actividad Económica</TableCell>
                <TableCell align="center">Establecimientos</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#1E3A8A' }} />
                    <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>
                      Cargando catálogo de empresas...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" sx={{ color: '#0F172A', fontWeight: 600 }}>
                      No se encontraron empresas
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>
                      Intente ajustar los términos de búsqueda o los filtros seleccionados.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCompanies.map((company) => (
                  <TableRow key={company.id} hover>
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: '#0F172A',
                            cursor: 'pointer',
                            '&:hover': { color: '#3B82F6' },
                          }}
                          onClick={() => navigate(`/companies/${company.id}`)}
                        >
                          {company.legalName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569' }}>
                          Comercial: {company.tradeName}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>
                        {company.rnc}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        {company.email}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#0F172A' }}>
                        {company.municipality}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        Prov. {company.province}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#475569',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {company.economicActivity}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        icon={<LocationCityIcon style={{ fontSize: 14 }} />}
                        label={`${company.establishmentsCount || 0} sedes`}
                        size="small"
                        sx={{ bgcolor: '#EFF6FF', color: '#1E3A8A', fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={company.active ? 'Activa' : 'Inactiva'}
                        size="small"
                        sx={{
                          bgcolor: company.active ? '#DCFCE7' : '#F1F5F9',
                          color: company.active ? '#15803D' : '#64748B',
                          fontWeight: 600,
                          fontSize: '0.72rem',
                        }}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Ver detalle y sedes físicas">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/companies/${company.id}`)}
                            sx={{ color: '#3B82F6' }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar empresa">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/companies/${company.id}`)}
                            sx={{ color: '#3B82F6' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredCompanies.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{ borderTop: '1px solid #E2E8F0' }}
        />
      </Card>

      {/* Modal for Creating Company */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ bgcolor: '#1E3A8A', color: '#FFFFFF', py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
              Registrar Nueva Empresa
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box component="form" onSubmit={handleCreateCompany} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Razón Social *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. Procesadora de Alimentos del Este, S.R.L."
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  RNC / Cédula Fiscal *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="101-00000-0"
                  value={formData.rnc}
                  onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Nombre Comercial
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. Alimentos del Este"
                  value={formData.tradeName}
                  onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Actividad Económica Principal
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. Fabricación de salsas y conservas vegetales"
                  value={formData.economicActivity}
                  onChange={(e) => setFormData({ ...formData, economicActivity: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Provincia *
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                >
                  <MenuItem value="Santiago">Santiago</MenuItem>
                  <MenuItem value="San Cristóbal">San Cristóbal</MenuItem>
                  <MenuItem value="Duarte">Duarte</MenuItem>
                  <MenuItem value="Santo Domingo">Santo Domingo</MenuItem>
                  <MenuItem value="La Vega">La Vega</MenuItem>
                  <MenuItem value="Puerto Plata">Puerto Plata</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Municipio *
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. Bajos de Haina"
                  value={formData.municipality}
                  onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                  required
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Dirección Legal Completa
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Calle, Número, Sector o Parque Industrial"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Correo Institucional *
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="contacto@empresa.com.do"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Teléfono Principal
                </Typography>
                <TextField
                  fullWidth
                  placeholder="(809) 555-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setModalOpen(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateCompany}
            disabled={saving}
            sx={{ bgcolor: '#1E3A8A', '&:hover': { bgcolor: '#1E40AF' } }}
          >
            {saving ? 'Guardando...' : 'Crear Empresa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
