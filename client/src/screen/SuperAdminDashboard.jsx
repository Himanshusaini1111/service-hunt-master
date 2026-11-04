// components/SuperAdminDashboard.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Paper, Typography, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TablePagination, Button, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Tabs, Tab, AppBar, Toolbar,
    Alert, CircularProgress, Snackbar, Tooltip // Add this import

} from '@mui/material';
import {
    Person, Business, BookOnline, Groups,
    Engineering, Receipt, Delete, Refresh,
    Visibility, CheckCircle, Cancel
} from '@mui/icons-material';

const SuperAdminDashboard = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [dashboardData, setDashboardData] = useState(null);
    const [entities, setEntities] = useState({ data: [], pagination: {} });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Replace this with your actual super admin user ID
    const SUPER_ADMIN_USER_ID = "6700b242c154a6dba882a054";

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        fetchEntities();
    }, [activeTab, page, rowsPerPage]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/superadmin/dashboard?userid=${SUPER_ADMIN_USER_ID}`);
            const data = await response.json();

            if (data.success) {
                setDashboardData(data);
            } else {
                setError(data.message || 'Failed to fetch dashboard data');
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const fetchEntities = async () => {
        setLoading(true);
        const endpoints = [
            'users',
            'services',
            'bookings',
            'vendors',
            'helpers',
            'pathners'
        ];

        const currentEndpoint = endpoints[activeTab];

        try {
            const response = await fetch(
                `/api/superadmin/${currentEndpoint}?userid=${SUPER_ADMIN_USER_ID}&page=${page + 1}&limit=${rowsPerPage}`
            );
            const data = await response.json();

            if (data.success) {
                setEntities({
                    data: data[currentEndpoint] || data.data || [],
                    pagination: data.pagination || {}
                });
            } else {
                setError(data.message || `Failed to fetch ${currentEndpoint}`);
            }
        } catch (error) {
            console.error(`Error fetching ${currentEndpoint}:`, error);
            setError(`Failed to fetch ${currentEndpoint}`);
        } finally {
            setLoading(false);
        }
    };

    // In your SuperAdminDashboard.jsx - Update the handleConvertToVendor function
    const handleConvertToVendor = async (pathnerId) => {
        try {
            if (!window.confirm('Are you sure you want to convert this pathner to vendor? This action cannot be undone.')) {
                return;
            }

            const response = await fetch(`/api/superadmin/pathner-to-vendor/${pathnerId}?userid=${SUPER_ADMIN_USER_ID}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to convert pathner');
            }

            if (data.success) {
                setSuccess('Pathner successfully converted to vendor');
                fetchEntities();
                fetchDashboardData();
            } else {
                setError(data.message || 'Failed to convert pathner');
            }
        } catch (error) {
            console.error('Error converting pathner:', error);
            setError(error.message || 'Failed to convert pathner');
        }
    };
    const handleStatusUpdate = async (entityId, newStatus) => {
        try {
            const response = await fetch(`/api/superadmin/bookings/${entityId}/status?userid=${SUPER_ADMIN_USER_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Booking status updated successfully');
                fetchEntities();
            } else {
                setError(data.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            setError('Failed to update status');
        }
    };

    const handleDelete = async (entity, id) => {
        if (window.confirm(`Are you sure you want to delete this ${entity}?`)) {
            try {
                const response = await fetch(`/api/superadmin/${entity}/${id}?userid=${SUPER_ADMIN_USER_ID}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (data.success) {
                    setSuccess(`${entity} deleted successfully`);
                    fetchEntities();
                    fetchDashboardData();
                } else {
                    setError(data.message || `Failed to delete ${entity}`);
                }
            } catch (error) {
                console.error(`Error deleting ${entity}:`, error);
                setError(`Failed to delete ${entity}`);
            }
        }
    };

    const handleCloseSnackbar = () => {
        setError('');
        setSuccess('');
    };

    const StatCard = ({ title, value, icon, color = "#1976d2" }) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography color="textSecondary" gutterBottom variant="h6">
                            {title}
                        </Typography>
                        <Typography variant="h4" component="div" fontWeight="bold">
                            {value}
                        </Typography>
                    </Box>
                    <Box sx={{ color, fontSize: 40 }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    const renderTable = () => {
        if (loading) {
            return (
                <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                    <CircularProgress />
                </Box>
            );
        }

        const headers = {
            0: ['Name', 'Email', 'Role', 'Actions'],
            1: ['Service Name', 'Category', 'Price', 'Visibility', 'Actions'],
            2: ['Customer', 'Service', 'Amount', 'Status', 'Date', 'Helpers', 'Vendor'],
            3: ['Name', 'Email', 'Phone', 'Status', 'Actions'], // Changed from Company
            4: ['Name', 'Email', 'Skills', 'Status', 'Actions'],
            5: ['Service', 'Owner', 'Email', 'Phone', 'Actions']
        };

        return (
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {headers[activeTab].map(header => (
                                <TableCell key={header}><strong>{header}</strong></TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entities.data.map((entity) => (
                            <TableRow key={entity._id}>
                                {renderTableRow(entity)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={entities.pagination.total || 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(event, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>
        );
    };

    const renderTableRow = (entity) => {
        switch (activeTab) {
            case 0: // Users
                return (
                    <>
                        <TableCell>{entity.name}</TableCell>
                        <TableCell>{entity.email}</TableCell>
                        <TableCell>
                            <Chip
                                label={entity.role === 'admin' ? 'Vendor' : entity.role}
                                color={
                                    entity.role === 'superadmin' ? 'secondary' :
                                        entity.role === 'admin' ? 'primary' : 'default'
                                }
                                size="small"
                            />
                        </TableCell>
                        <TableCell>
                            <IconButton
                                color="error"
                                onClick={() => handleDelete('user', entity._id)}
                                disabled={entity.role === 'superadmin'}
                            >
                                <Delete />
                            </IconButton>
                        </TableCell>
                    </>
                );
            case 1: // Services
                return (
                    <>
                        <TableCell>{entity.name}</TableCell>
                        <TableCell>{entity.category}</TableCell>
                        <TableCell>${entity.rentperday}</TableCell>
                        <TableCell>
                            <Chip
                                label={entity.isVisible ? 'Visible' : 'Hidden'}
                                color={entity.isVisible ? 'success' : 'default'}
                                size="small"
                            />
                        </TableCell>
                        <TableCell>
                            <Button
                                size="small"
                                onClick={() => handleDelete('service', entity._id)}
                                color="error"
                            >
                                Delete
                            </Button>
                        </TableCell>
                    </>
                );
            case 2: // Bookings
                return (
                    <>
                        <TableCell>{entity.userid?.name || 'N/A'}</TableCell>
                        <TableCell>{entity.service || 'N/A'}</TableCell>

                        <TableCell>${entity.totalAmount || 0}</TableCell>
                        <TableCell>
                            <Chip
                                label={entity.status}
                                color={
                                    entity.status === 'completed' ? 'success' :
                                        entity.status === 'cancelled' ? 'error' :
                                            entity.status === 'in-progress' ? 'warning' : 'primary'
                                }
                                size="small"
                            />
                        </TableCell>
                        <TableCell>{new Date(entity.createdAt).toLocaleDateString()}</TableCell>

                        <TableCell>
                            {entity.assignedHelpers && entity.assignedHelpers.length > 0 ? (
                                <Tooltip title={
                                    entity.assignedHelpers.map(helper =>
                                        `${helper.name} (${helper.phone})`
                                    ).join('\n')
                                }>
                                    <Chip
                                        label={`${entity.assignedHelpers.length} helpers`}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Tooltip>
                            ) : (
                                <Chip label="No helpers" size="small" variant="outlined" />
                            )}
                        </TableCell>
                        <TableCell>
                            {entity.vendorId ? (
                                <Tooltip title={`Email: ${entity.vendorId.email}\nPhone: ${entity.vendorId.phone}`}>
                                    <Chip
                                        label={entity.vendorId.companyName}
                                        color="secondary"
                                        size="small"
                                        variant="outlined"
                                    />
                                </Tooltip>
                            ) : (
                                'No Vendor'
                            )}
                        </TableCell>

                    </>
                );

            case 3: // Vendors - Show users with 'admin' role
                return (
                    <>
                        <TableCell>{entity.name}</TableCell>
                        <TableCell>{entity.email}</TableCell>
                        <TableCell>{entity.phone || 'N/A'}</TableCell>
                        <TableCell>
                            <Chip
                                label="Active Vendor"
                                color="success"
                                size="small"
                            />
                        </TableCell>
                        <TableCell>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleDelete('vendor', entity._id)}
                                disabled={entity.role === 'superadmin' || entity.email === 'himanshufa875@gmail.com'}
                                color="error"
                            >
                                Remove Vendor
                            </Button>
                        </TableCell>
                    </>
                );
            case 4: // Helpers
                return (
                    <>
                        <TableCell>{entity.name}</TableCell>
                        <TableCell>{entity.email || 'N/A'}</TableCell>
                        <TableCell>{entity.skills || 'N/A'}</TableCell>
                        <TableCell>
                            <Chip
                                label={entity.availability || 'Available'}
                                color="primary"
                                size="small"
                            />
                        </TableCell>
                        <TableCell>
                            <IconButton
                                color="error"
                                onClick={() => handleDelete('helper', entity._id)}
                            >
                                <Delete />
                            </IconButton>
                        </TableCell>
                    </>
                );
            case 5: // Pathners
                return (
                    <>
                        <TableCell>{entity.serviceName}</TableCell>
                        <TableCell>{entity.ownerDetails}</TableCell>
                        <TableCell>{entity.emailDetails}</TableCell>
                        <TableCell>{entity.phoneNumber}</TableCell>
                        <TableCell>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircle />}
                                onClick={() => handleConvertToVendor(entity._id)}
                                size="small"
                            >
                                Make Vendor
                            </Button>
                            <IconButton
                                color="error"
                                onClick={() => handleDelete('pathner', entity._id)}
                                sx={{ ml: 1 }}
                            >
                                <Delete />
                            </IconButton>
                        </TableCell>
                    </>
                );
            default:
                return <TableCell colSpan={5}>No data available</TableCell>;
        }
    };

    const tabLabels = ['Users', 'Services', 'Bookings', 'Vendors', 'Helpers', 'Pathners'];

    if (loading && !dashboardData) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
            <AppBar position="static" elevation={2}>
                <Toolbar>
                    <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                        🛠️ Super Admin Panel
                    </Typography>
                    <Button
                        color="inherit"
                        startIcon={<Refresh />}
                        onClick={fetchDashboardData}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Toolbar>
            </AppBar>

            <Box sx={{ p: 3 }}>
                {/* Statistics Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <StatCard
                            title="Total Users"
                            value={dashboardData?.stats?.totalUsers || 0}
                            icon={<Person />}
                            color="#1976d2"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <StatCard
                            title="Total Services"
                            value={dashboardData?.stats?.totalServices || 0}
                            icon={<Business />}
                            color="#2e7d32"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <StatCard
                            title="Total Bookings"
                            value={dashboardData?.stats?.totalBookings || 0}
                            icon={<BookOnline />}
                            color="#ed6c02"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <StatCard
                            title="Today's Bookings"
                            value={dashboardData?.stats?.todaysBookings || 0}
                            icon={<Receipt />}
                            color="#9c27b0"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <StatCard
                            title="Pending Pathners"
                            value={dashboardData?.stats?.pendingPathners || 0}
                            icon={<Groups />}
                            color="#d32f2f"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4} lg={2}>
                        <StatCard
                            title="Total Revenue"
                            value={`$${dashboardData?.stats?.totalRevenue || 0}`}
                            icon={<Receipt />}
                            color="#388e3c"
                        />
                    </Grid>
                </Grid>

                {/* Tabs Section */}
                <Paper sx={{ width: '100%', mb: 2 }} elevation={3}>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => {
                            setActiveTab(newValue);
                            setPage(0);
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        {tabLabels.map((label, index) => (
                            <Tab key={index} label={label} />
                        ))}
                    </Tabs>

                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {tabLabels[activeTab]} Management
                        </Typography>
                        {renderTable()}
                    </Box>
                </Paper>
            </Box>

            {/* Notifications */}
            <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>

            <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
                    {success}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SuperAdminDashboard;