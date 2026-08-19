import React, { useState, useRef, useEffect, useId } from 'react';
import { GlassSearchIcon, GlassCheckCircleIcon } from './GlassIcons';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: { bg: string; text: string };
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  placeholder = '-- Select an option --',
  searchPlaceholder = 'Type to search...',
  disabled = false,
  style,
  className = '',
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q)) ||
      opt.value.toLowerCase().includes(q)
    );
  });

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setHighlightIndex(0);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-select-item]');
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightIndex]) {
        onChange(filteredOptions[highlightIndex].value);
        setIsOpen(false);
        setSearch('');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      id={id}
      className={`searchable-select-container ${className}`}
      style={{ position: 'relative', width: '100%', userSelect: 'none', ...style }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '12px',
          border: isOpen ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
          background: disabled ? '#F8FAFC' : '#FFFFFF',
          color: selectedOption ? '#0F172A' : '#94A3B8',
          fontSize: '13.5px',
          fontWeight: selectedOption ? 600 : 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none',
          minHeight: '42px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption?.icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{selectedOption.icon}</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: selectedOption.badgeColor?.bg || '#EFF6FF',
                color: selectedOption.badgeColor?.text || '#2563EB',
                flexShrink: 0
              }}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Chevron Indicator */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            marginLeft: '8px'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 99999,
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.9)',
            padding: '8px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Integrated Search Input Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#F8FAFC',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              marginBottom: '6px'
            }}
          >
            <GlassSearchIcon size={16} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightIndex(0);
              }}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A',
                fontFamily: 'inherit',
                padding: 0
              }}
            />
            {search && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch('');
                  searchInputRef.current?.focus();
                }}
                style={{
                  background: '#E2E8F0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#475569',
                  padding: 0
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="hide-scrollbar"
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>
                No matches found for "{search}"
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    data-select-item
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      background: isSelected ? '#EFF6FF' : isHighlighted ? '#F8FAFC' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {opt.icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{opt.icon}</span>}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#2563EB' : '#0F172A' }}>
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: opt.badgeColor?.bg || '#F1F5F9',
                            color: opt.badgeColor?.text || '#475569'
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <GlassCheckCircleIcon size={16} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
