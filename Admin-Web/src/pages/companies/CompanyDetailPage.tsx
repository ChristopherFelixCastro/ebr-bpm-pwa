import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PeopleIcon from '@mui/icons-material/People';
import FastfoodIcon from '@mui/icons-material/Fastfood';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { apiService } from '../../services/api';
import { FOOD_CATALOG } from '../../services/mockData';
import { useNotification } from '../../context/NotificationContext';
import type { Company, Establishment, Contact, ContactRole } from '../../types';

export const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [company, setCompany] = useState<Company | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Edit Company General Data
  const [isEditing, setIsEditing] = useState(false);
  const [companyForm, setCompanyForm] = useState<Partial<Company>>({});
  const [savingCompany, setSavingCompany] = useState(false);

  // New Establishment Modal
  const [estModalOpen, setEstModalOpen] = useState(false);
  const [savingEst, setSavingEst] = useState(false);
  const [estForm, setEstForm] = useState({
    name: '',
    address: '',
    municipality: '',
    province: 'Santiago',
    permitNo: '',
    operationsStartDate: new Date().toISOString().split('T')[0],
    active: true,
  });

  // Contact Modal
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactMode, setContactMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [targetEstId, setTargetEstId] = useState('');
  const [targetRole, setTargetRole] = useState<ContactRole>('CALIDAD');
  const [newContactForm, setNewContactForm] = useState({
    fullName: '',
    identityNumber: '',
    phone: '',
    email: '',
  });

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const comp = await apiService.getCompanyById(id);
      if (!comp) {
        showError('Empresa no encontrada');
        navigate('/companies');
        return;
      }
      setCompany(comp);
      setCompanyForm(comp);

      const ests = await apiService.getEstablishments(id);
      setEstablishments(ests);
      if (ests.length > 0) {
        setTargetEstId(ests[0].id);
      }

      const conts = await apiService.getContacts();
      setContacts(conts);
    } catch {
      showError('Error al cargar datos de la empresa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSaveCompany = async () => {
    if (!company) return;
    try {
      setSavingCompany(true);
      const updated = await apiService.updateCompany(company.id, companyForm);
      setCompany(updated);
      setIsEditing(false);
      showSuccess('Datos de la empresa actualizados');
    } catch (err: any) {
      showError(err.message || 'Error al actualizar');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleCreateEstablishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !estForm.name.trim() || !estForm.permitNo.trim()) {
      showError('Complete los campos obligatorios del establecimiento');
      return;
    }
    try {
      setSavingEst(true);
      await apiService.createEstablishment({
        ...estForm,
        companyId: company.id,
      });
      showSuccess('Establecimiento registrado exitosamente');
      setEstModalOpen(false);
      setEstForm({
        name: '',
        address: '',
        municipality: '',
        province: 'Santiago',
        permitNo: '',
        operationsStartDate: new Date().toISOString().split('T')[0],
        active: true,
      });
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Error al guardar establecimiento');
    } finally {
      setSavingEst(false);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEstId) {
      showError('Seleccione el establecimiento');
      return;
    }
    const targetEst = establishments.find((e) => e.id === targetEstId);

    try {
      setSavingContact(true);
      if (contactMode === 'NEW') {
        if (!newContactForm.fullName.trim() || !newContactForm.identityNumber.trim()) {
          showError('Complete el nombre y la cédula del contacto');
          return;
        }

        const created = await apiService.createContact({
          ...newContactForm,
          active: true,
          role: targetRole,
        });

        await apiService.assignContactToEstablishment(
          created.id,
          targetEstId,
          targetEst?.name || 'Sede',
          targetRole
        );
        showSuccess('Contacto registrado y asignado exitosamente');
      } else {
        if (!selectedContactId) {
          showError('Seleccione un contacto existente');
          return;
        }
        await apiService.assignContactToEstablishment(
          selectedContactId,
          targetEstId,
          targetEst?.name || 'Sede',
          targetRole
        );
        showSuccess('Contacto asignado a la sede exitosamente');
      }

      setContactModalOpen(false);
      setNewContactForm({ fullName: '', identityNumber: '', phone: '', email: '' });
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Error al gestionar contacto');
    } finally {
      setSavingContact(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#1E3A8A' }} />
      </Box>
    );
  }

  if (!company) return null;

  return (
    <Box>
      {/* Top back button */}
      <Button
        variant="text"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/companies')}
        sx={{ mb: 2, color: '#475569', fontWeight: 600 }}
      >
        Volver al Listado de Empresas
      </Button>

      {/* Main Title Banner */}
      <Card sx={{ mb: 3, border: '1px solid #E2E8F0', borderRadius: 2 }}>
        <Box
          sx={{
            p: 3,
            bgcolor: '#1E3A8A',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { sm: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BusinessIcon sx={{ fontSize: 32, color: '#FFFFFF' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFFFFF' }}>
                {company.legalName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#BFDBFE' }}>
                RNC: {company.rnc} • Comercial: {company.tradeName}
              </Typography>
            </Box>
          </Box>

          <Chip
            label={company.active ? 'Empresa Activa' : 'Empresa Inactiva'}
            sx={{
              bgcolor: company.active ? '#DCFCE7' : '#F1F5F9',
              color: company.active ? '#15803D' : '#64748B',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          />
        </Box>

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: '#E2E8F0' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                minHeight: 48,
              },
            }}
          >
            <Tab icon={<BusinessIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="1. Datos Generales" />
            <Tab icon={<LocationCityIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`2. Establecimientos Físicos (${establishments.length})`} />
            <Tab icon={<PeopleIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="3. Catálogo de Contactos" />
            <Tab icon={<FastfoodIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="4. Perfil Alimentario (EBR)" />
          </Tabs>
        </Box>
      </Card>

      {/* TAB 0: DATOS GENERALES */}
      {activeTab === 0 && (
        <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                Información Jurídica y Domicilio Legal
              </Typography>
              {!isEditing ? (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<EditIcon sx={{ color: '#3B82F6' }} />}
                  onClick={() => setIsEditing(true)}
                >
                  Editar Información
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" color="secondary" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveCompany}
                    disabled={savingCompany}
                    sx={{ bgcolor: '#1E3A8A' }}
                  >
                    {savingCompany ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Razón Social
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.legalName || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  RNC / Cédula Fiscal
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.rnc || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, rnc: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Nombre Comercial
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.tradeName || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Actividad Económica Principal
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.economicActivity || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, economicActivity: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Provincia
                </Typography>
                <TextField
                  select
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.province || 'Santiago'}
                  onChange={(e) => setCompanyForm({ ...companyForm, province: e.target.value })}
                >
                  <MenuItem value="Santiago">Santiago</MenuItem>
                  <MenuItem value="San Cristóbal">San Cristóbal</MenuItem>
                  <MenuItem value="Duarte">Duarte</MenuItem>
                  <MenuItem value="Santo Domingo">Santo Domingo</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Municipio
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.municipality || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, municipality: e.target.value })}
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Dirección Legal
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.address || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Correo Electrónico
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.email || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Teléfono
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  value={companyForm.phone || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* TAB 1: ESTABLECIMIENTOS FÍSICOS */}
      {activeTab === 1 && (
        <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                Establecimientos y Plantas Físicas
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569' }}>
                Las inspecciones BPM se realizan y auditan a nivel de establecimiento físico.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setEstModalOpen(true)}
              sx={{ bgcolor: '#1E3A8A' }}
            >
              Nuevo Establecimiento
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre del Establecimiento</TableCell>
                  <TableCell>Permiso / Registro Sanitario</TableCell>
                  <TableCell>Ubicación y Municipio</TableCell>
                  <TableCell>Inicio de Operaciones</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {establishments.map((est) => (
                  <TableRow key={est.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LocationCityIcon sx={{ color: '#3B82F6' }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {est.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#475569' }}>
                            {est.address}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={est.permitNo}
                        size="small"
                        sx={{ bgcolor: '#EFF6FF', color: '#1E3A8A', fontWeight: 600, borderRadius: 1 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#0F172A' }}>
                        {est.municipality}, Prov. {est.province}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        {est.operationsStartDate}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={est.active ? 'Operativo' : 'Inactivo'}
                        size="small"
                        sx={{
                          bgcolor: est.active ? '#DCFCE7' : '#F1F5F9',
                          color: est.active ? '#15803D' : '#64748B',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 2: CATÁLOGO DE CONTACTOS */}
      {activeTab === 2 && (
        <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
                Contactos Clave Reutilizables
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569' }}>
                Catálogo de personas clave (Propietarios, Representante Legal, Calidad) asociados a los establecimientos.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setContactModalOpen(true)}
              sx={{ bgcolor: '#1E3A8A' }}
            >
              Asignar / Crear Contacto
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre y Cédula</TableCell>
                  <TableCell>Contacto (Teléfono / Email)</TableCell>
                  <TableCell>Sede Asignada</TableCell>
                  <TableCell>Rol de Contacto</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                        {contact.fullName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        Cédula: {contact.identityNumber}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#0F172A' }}>
                        {contact.email}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        {contact.phone}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {contact.establishmentAssociations && contact.establishmentAssociations.length > 0 ? (
                        contact.establishmentAssociations.map((a, i) => (
                          <Typography key={i} variant="caption" sx={{ display: 'block', color: '#0F172A', fontWeight: 500 }}>
                            • {a.establishmentName}
                          </Typography>
                        ))
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          Sin asignación directa
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={contact.role || 'CONTACTO'}
                        size="small"
                        sx={{
                          bgcolor: contact.role === 'CALIDAD' ? '#E0F2FE' : '#FEF3C7',
                          color: contact.role === 'CALIDAD' ? '#0369A1' : '#B45309',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={contact.active ? 'Vigente' : 'Inactivo'}
                        size="small"
                        sx={{
                          bgcolor: contact.active ? '#DCFCE7' : '#F1F5F9',
                          color: contact.active ? '#15803D' : '#64748B',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* TAB 3: PERFIL ALIMENTARIO */}
      {activeTab === 3 && (
        <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Box sx={{ p: 3, borderBottom: '1px solid #E2E8F0' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Perfil Alimentario y Clasificación de Riesgo
            </Typography>
            <Typography variant="body2" sx={{ color: '#475569' }}>
              Subcategorías alimentarias y puntaje microbiológico aplicable para el establecimiento según el SDP oficial.
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Subcategoría Alimentaria</TableCell>
                  <TableCell>Riesgo Microbiológico</TableCell>
                  <TableCell align="center">Puntaje de Riesgo (1 - 3)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {FOOD_CATALOG.map((food) => (
                  <TableRow key={food.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                        {food.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#475569' }}>
                        {food.subcategory}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={food.microbiologicalRisk}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor:
                            food.microbiologicalRisk === 'ALTO'
                              ? '#FEE2E2'
                              : food.microbiologicalRisk === 'MEDIO'
                              ? '#FEF3C7'
                              : '#DCFCE7',
                          color:
                            food.microbiologicalRisk === 'ALTO'
                              ? '#991B1B'
                              : food.microbiologicalRisk === 'MEDIO'
                              ? '#B45309'
                              : '#15803D',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                        {food.riskScore}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Modal for New Establishment */}
      <Dialog
        open={estModalOpen}
        onClose={() => setEstModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ bgcolor: '#1E3A8A', color: '#FFFFFF', py: 2 }}>
          Registrar Nuevo Establecimiento Físico
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box component="form" onSubmit={handleCreateEstablishment} sx={{ mt: 1 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Nombre del Establecimiento / Planta *
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. Planta Envasadora de Líquidos"
                value={estForm.name}
                onChange={(e) => setEstForm({ ...estForm, name: e.target.value })}
                required
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Número de Permiso Sanitario / Registro *
              </Typography>
              <TextField
                fullWidth
                placeholder="RS-DAC-2026-XXXX"
                value={estForm.permitNo}
                onChange={(e) => setEstForm({ ...estForm, permitNo: e.target.value })}
                required
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Provincia
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={estForm.province}
                  onChange={(e) => setEstForm({ ...estForm, province: e.target.value })}
                >
                  <MenuItem value="Santiago">Santiago</MenuItem>
                  <MenuItem value="San Cristóbal">San Cristóbal</MenuItem>
                  <MenuItem value="Duarte">Duarte</MenuItem>
                  <MenuItem value="Santo Domingo">Santo Domingo</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Municipio
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Ej. Licey al Medio"
                  value={estForm.municipality}
                  onChange={(e) => setEstForm({ ...estForm, municipality: e.target.value })}
                  required
                />
              </Grid>
            </Grid>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Dirección Física Completa
              </Typography>
              <TextField
                fullWidth
                placeholder="Calle y Kilómetro exacto"
                value={estForm.address}
                onChange={(e) => setEstForm({ ...estForm, address: e.target.value })}
                required
              />
            </Box>

            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Fecha de Inicio de Operaciones
              </Typography>
              <TextField
                type="date"
                fullWidth
                value={estForm.operationsStartDate}
                onChange={(e) => setEstForm({ ...estForm, operationsStartDate: e.target.value })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button variant="outlined" color="secondary" onClick={() => setEstModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateEstablishment}
            disabled={savingEst}
            sx={{ bgcolor: '#1E3A8A' }}
          >
            {savingEst ? 'Guardando...' : 'Crear Sede'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal for Contact Creation / Association */}
      <Dialog
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ bgcolor: '#1E3A8A', color: '#FFFFFF', py: 2 }}>
          Gestión de Contacto de Establecimiento
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box component="form" onSubmit={handleSaveContact} sx={{ mt: 1 }}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Establecimiento Asociado *
              </Typography>
              <TextField
                select
                fullWidth
                value={targetEstId}
                onChange={(e) => setTargetEstId(e.target.value)}
              >
                {establishments.map((est) => (
                  <MenuItem key={est.id} value={est.id}>
                    {est.name} ({est.permitNo})
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Rol del Contacto en el Establecimiento *
              </Typography>
              <TextField
                select
                fullWidth
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as ContactRole)}
              >
                <MenuItem value="PROPIETARIO">Propietario / Director General</MenuItem>
                <MenuItem value="REPRESENTANTE_LEGAL">Representante Legal</MenuItem>
                <MenuItem value="CALIDAD">Responsable de Aseguramiento de Calidad</MenuItem>
                <MenuItem value="CONTACTO_PRINCIPAL">Contacto Principal Operativo</MenuItem>
              </TextField>
            </Box>

            <Tabs
              value={contactMode}
              onChange={(_, val) => setContactMode(val)}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab value="NEW" label="Crear Nuevo Contacto" sx={{ textTransform: 'none', fontWeight: 600 }} />
              <Tab value="EXISTING" label="Vincular Contacto Existente" sx={{ textTransform: 'none', fontWeight: 600 }} />
            </Tabs>

            {contactMode === 'NEW' ? (
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Nombre Completo *
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Ej. Ing. Patricia Castillo"
                    value={newContactForm.fullName}
                    onChange={(e) => setNewContactForm({ ...newContactForm, fullName: e.target.value })}
                    required
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Cédula de Identidad * (Deduplicación)
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Ej. 031-0948371-2"
                    value={newContactForm.identityNumber}
                    onChange={(e) => setNewContactForm({ ...newContactForm, identityNumber: e.target.value })}
                    required
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Correo
                    </Typography>
                    <TextField
                      fullWidth
                      type="email"
                      placeholder="pcastillo@empresa.com"
                      value={newContactForm.email}
                      onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Teléfono
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="(809) 555-4321"
                      value={newContactForm.phone}
                      onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Seleccionar Contacto del Catálogo Central *
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                >
                  {contacts.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.fullName} — Céd: {c.identityNumber} ({c.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button variant="outlined" color="secondary" onClick={() => setContactModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveContact}
            disabled={savingContact}
            sx={{ bgcolor: '#1E3A8A' }}
          >
            {savingContact ? 'Guardando...' : 'Asignar Contacto'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
