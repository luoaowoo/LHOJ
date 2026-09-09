import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { ScoreboardRow } from '../types';

interface ScoreboardTableProps {
  title: string;
  headers: string[];
  rows: ScoreboardRow[];
}

export default function ScoreboardTable({ title, headers, rows }: ScoreboardTableProps) {
  return (
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Box>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 620 }} aria-label={title}>
          {headers.length ? (
            <TableHead>
              <TableRow>
                {headers.map((header, index) => <TableCell key={index}>{header || `列 ${index + 1}`}</TableCell>)}
              </TableRow>
            </TableHead>
          ) : null}
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index} hover>
                {row.cells.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell || '-'}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
