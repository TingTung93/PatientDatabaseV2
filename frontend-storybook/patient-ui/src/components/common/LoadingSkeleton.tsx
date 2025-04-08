import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

export const PatientDetailSkeleton: React.FC = (): JSX.Element => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header Skeleton */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Skeleton variant="text" width={300} height={40} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={80} height={36} />
          <Skeleton variant="rectangular" width={80} height={36} />
        </Box>
      </Box>

      {/* Patient Information Card Skeleton */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flexBasis: { xs: '100%', md: 'calc(50% - 8px)' }, flexGrow: 1 }}>
              {[...Array(4)].map((_, i) => (
                <Box key={`left-${i}`} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="text" width={180} />
                </Box>
              ))}
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', md: 'calc(50% - 8px)' }, flexGrow: 1 }}>
              {[...Array(4)].map((_, i) => (
                <Box key={`right-${i}`} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="text" width={180} />
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Caution Cards Section Skeleton */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Card>
          <CardContent>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={`caution-${i}`} variant="rectangular" height={40} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        </Card>
      </Box>

      {/* Reports Section Skeleton */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="rectangular" width={120} height={36} />
        </Box>
        <Card>
          <CardContent>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={`report-${i}`} variant="rectangular" height={40} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export const ReportsListSkeleton: React.FC = (): JSX.Element => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <Skeleton variant="text" width={150} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={100} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={100} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={120} />
            </TableCell>
            <TableCell align="right">
              <Skeleton variant="text" width={80} />
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton variant="text" width={180} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={120} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={100} />
              </TableCell>
              <TableCell>
                <Skeleton variant="text" width={150} />
              </TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Skeleton variant="rectangular" width={60} height={32} />
                  <Skeleton variant="rectangular" width={60} height={32} />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
