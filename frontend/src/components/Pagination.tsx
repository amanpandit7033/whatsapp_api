import React from 'react';
import { CaretLeftIcon, CaretRightIcon } from './Icons';

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  limit?: number;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
  itemName?: string;
  style?: React.CSSProperties;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalCount,
  limit = 10,
  onPageChange,
  loading = false,
  itemName = 'results',
  style
}) => {
  const safeTotalPages = Math.max(1, totalPages || Math.ceil(totalCount / limit) || 1);
  const startRecord = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, totalCount);

  // Generate visible page numbers with smart ellipsis
  const getPages = () => {
    const pages: (number | string)[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(safeTotalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (page < safeTotalPages - 2) pages.push('...');
      if (!pages.includes(safeTotalPages)) pages.push(safeTotalPages);
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '18px 28px',
        borderTop: '1px solid #F1F5F9',
        background: '#FAFAFA',
        ...style
      }}
    >
      {/* Result Count Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
        <span>
          Showing <strong style={{ color: '#0F172A' }}>{startRecord}</strong> – <strong style={{ color: '#0F172A' }}>{endRecord}</strong> of <strong style={{ color: '#0F172A' }}>{totalCount.toLocaleString()}</strong> {itemName}
        </span>
      </div>

      {/* Navigation Controls */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Prev Button */}
        <button
          type="button"
          disabled={page === 1 || loading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          title="Previous Page"
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '10px',
            background: page === 1 ? '#F1F5F9' : '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: page === 1 ? '#94A3B8' : '#0F172A',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: page === 1 || loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
            boxShadow: page === 1 ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <CaretLeftIcon size={14} />
          <span>Prev</span>
        </button>

        {/* Page Number Pills with Ellipsis */}
        {getPages().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94A3B8', fontWeight: 800, fontSize: '13px' }}>
                •••
              </span>
            );
          }
          const isActive = p === page;
          return (
            <button
              key={`page-${p}`}
              type="button"
              disabled={loading}
              onClick={() => onPageChange(Number(p))}
              style={{
                minWidth: '36px',
                height: '36px',
                padding: '0 10px',
                borderRadius: '10px',
                background: isActive ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#334155',
                border: isActive ? 'none' : '1px solid #E2E8F0',
                fontWeight: isActive ? 800 : 700,
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.28)' : '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              {Number(p).toString().padStart(2, '0')}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          type="button"
          disabled={page >= safeTotalPages || loading}
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          title="Next Page"
          style={{
            height: '36px',
            padding: '0 12px',
            borderRadius: '10px',
            background: page >= safeTotalPages ? '#F1F5F9' : '#FFFFFF',
            border: '1px solid #E2E8F0',
            color: page >= safeTotalPages ? '#94A3B8' : '#0F172A',
            fontWeight: 700,
            fontSize: '12.5px',
            cursor: page >= safeTotalPages || loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease',
            boxShadow: page >= safeTotalPages ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <span>Next</span>
          <CaretRightIcon size={14} />
        </button>
      </div>
    </div>
  );
};
