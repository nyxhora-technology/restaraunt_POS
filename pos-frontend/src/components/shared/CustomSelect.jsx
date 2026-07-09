import React, { useState, useRef, useEffect } from "react";
import { MdKeyboardArrowDown, MdCheck } from "react-icons/md";

const CustomSelect = ({
  value: propValue,
  defaultValue,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
  name,
  disabled = false,
  required = false,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const value = propValue !== undefined ? propValue : internalValue;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current.focus(), 50);
      }
    } else {
      setSearchQuery("");
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, searchable]);

  const handleSelect = (option) => {
    if (propValue === undefined) {
      setInternalValue(option.value);
    }
    if (onChange) {
      onChange({
        target: { name, value: option.value },
        stopPropagation: () => {},
        preventDefault: () => {},
      });
    }
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  
  const filteredOptions = searchable 
    ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div 
      className={`relative w-full ${className}`} 
      ref={containerRef}
      style={{ zIndex: isOpen ? 50 : 1 }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={buttonClassName || `w-full flex items-center justify-between bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] p-2.5 rounded-lg focus:outline-none focus:border-[var(--dash-primary)] transition-colors text-sm ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={selectedOption ? "truncate" : "text-[var(--dash-muted)] truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <MdKeyboardArrowDown
          className={`transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
          size={20}
        />
      </button>

      {/* Hidden native input for required validation and FormData submission */}
      {name && (
        <input
          type="text"
          name={name}
          value={value || ""}
          required={required}
          className="absolute opacity-0 -z-10 w-full h-full left-0 top-0 pointer-events-none"
          onChange={() => {}}
          onFocus={() => setIsOpen(true)}
          tabIndex={-1}
        />
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-lg shadow-lg max-h-60 flex flex-col overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-[var(--dash-border)] shrink-0">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[var(--dash-surface-muted)] text-[var(--dash-text)] text-sm px-3 py-1.5 rounded border border-[var(--dash-border)] focus:outline-none focus:border-[var(--dash-primary)]"
              />
            </div>
          )}
          
          <div className="overflow-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-[var(--dash-muted)] text-center">
                No options available
              </div>
            ) : (
              <ul className="py-1 m-0 list-none">
                {filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-[var(--dash-surface-muted)] transition-colors flex items-center justify-between ${
                      String(value) === String(option.value)
                        ? "text-[var(--dash-primary)] font-medium bg-[var(--dash-primary-soft)]"
                        : "text-[var(--dash-text)]"
                    }`}
                  >
                    {option.label}
                    {String(value) === String(option.value) && (
                      <MdCheck className="text-[var(--dash-primary)] shrink-0" size={16} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
