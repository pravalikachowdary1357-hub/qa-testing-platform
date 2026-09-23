import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import ApartmentIcon from '@mui/icons-material/Apartment';
import GroupsIcon from '@mui/icons-material/Groups';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';
import { SummaryCard } from '../common/SummaryCard';
import { StatusChip } from '../common/StatusChip';
import { fetchOrganizations } from '../../api/organizations';
import { fetchUsers } from '../../api/users';
import { fetchRoles } from '../../api/roles';
import { fetchAuditLog } from '../../api/auditLog';
import { ApiError } from '../../api/client';
import type { ApiOrganization } from '../../types/organization';
import type { ApiUser, ApiRole, ApiAuditLogEntry } from '../../types/settings';

const STATUS_LABELS: Record<ApiOrganization['status'], string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

// Platform-administration view of the Dashboard: shown to System
// Administrator instead of the per-product QA execution dashboard, since
// that role administers the platform/organizations/users rather than
// running tests. Built entirely from data the existing Organizations/
// Users/Roles/Audit Log endpoints already return -- no new backend code.
export function PlatformAdminDashboard() {
  const [organizations, setOrganizations] = useState<ApiOrganization[] | null>(null);
  const [users, setUsers] = useState<ApiUser[] | null>(null);
  const [roles, setRoles] = useState<ApiRole[] | null>(null);
  const [activity, setActivity] = useState<ApiAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchOrganizations(), fetchUsers(), fetchRoles(), fetchAuditLog()])
      .then(([orgs, userList, roleList, auditEntries]) => {
        if (cancelled) return;
        setOrganizations(orgs);
        setUsers(userList);
        setRoles(roleList);
        setActivity(auditEntries.slice(0, 10));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load platform data (HTTP ${err.status}).`
            : 'Failed to load platform data. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !error && (!organizations || !users || !roles || !activity);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const orgs = organizations!;
  const userList = users!;
  const roleList = roles!;
  const activeUsers = userList.filter((u) => u.status === 'ACTIVE').length;

  const totals = orgs.reduce(
    (acc, org) => ({
      businessUnits: acc.businessUnits + org.businessUnitCount,
      teams: acc.teams + org.teamCount,
      projects: acc.projects + org.projectCount,
      products: acc.products + org.productCount,
    }),
    { businessUnits: 0, teams: 0, projects: 0, products: 0 },
  );

  const kpis = [
    { title: 'Organizations', value: orgs.length, icon: BusinessIcon },
    { title: 'Business Units', value: totals.businessUnits, icon: ApartmentIcon },
    { title: 'Teams', value: totals.teams, icon: GroupsIcon },
    { title: 'Projects', value: totals.projects, icon: FolderSpecialIcon },
    { title: 'Products', value: totals.products, icon: Inventory2Icon },
    { title: 'Users', value: `${activeUsers} / ${userList.length}`, icon: PeopleIcon },
  ];

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {kpis.map((kpi) => (
          <Grid key={kpi.title} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <SummaryCard title={kpi.title} value={kpi.value} icon={kpi.icon} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Organizations
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Organization</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Business Units</TableCell>
                  <TableCell align="right">Teams</TableCell>
                  <TableCell align="right">Products</TableCell>
                  <TableCell align="right">Users</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                      No organizations yet.
                    </TableCell>
                  </TableRow>
                )}
                {orgs.map((org) => (
                  <TableRow key={org.id} hover>
                    <TableCell>{org.name}</TableCell>
                    <TableCell>
                      <StatusChip status={STATUS_LABELS[org.status]} />
                    </TableCell>
                    <TableCell align="right">{org.businessUnitCount}</TableCell>
                    <TableCell align="right">{org.teamCount}</TableCell>
                    <TableCell align="right">{org.productCount}</TableCell>
                    <TableCell align="right">{org.userCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Roles
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Users</TableCell>
                  <TableCell align="right">Permissions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roleList.map((role) => (
                  <TableRow key={role.id} hover>
                    <TableCell>{role.name}</TableCell>
                    <TableCell align="right">{role.userCount}</TableCell>
                    <TableCell align="right">{role.permissions.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Recent Platform Activity
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Summary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activity!.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary' }}>
                      No activity recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {activity!.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{entry.actor ? entry.actor.name : 'Unknown'}</TableCell>
                    <TableCell>{entry.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </>
  );
}
