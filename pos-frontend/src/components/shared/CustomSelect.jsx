import React, { useState, useRef, useEffect } from "react";
import { MdKeyboardArrowDown, MdCheck } from "react-icons/md";

const CustomSelect = ({
  value: propValue,
  defaultValue,
  onChange,
  options = [],
  placeholder = "Select...",
  className = "",
  name,
  disabled = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const containerRef = useRef(null);

  const value = propValue !== undefined ? propValue : internalValue;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

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

  // The wrapper takes the layout classes from className, but we don't want to pass bg/border classes to the wrapper.
  // Actually, standardizing on className replacing the container's or the button's classes?
  // Let's apply custom margins/widths to the wrapper, and standard styles to the button.
  // We'll extract width/margin classes for the wrapper if needed, but it's simpler to just let the button expand to full width of wrapper.

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-[var(--dash-surface-muted)] border border-[var(--dash-border)] text-[var(--dash-text)] p-2.5 rounded-lg focus:outline-none focus:border-[var(--dash-primary)] transition-colors text-sm ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
        <div className="absolute z-50 w-full mt-1 bg-[var(--dash-surface)] border border-[var(--dash-border)] rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-[var(--dash-muted)] text-center">
              No options available
            </div>
          ) : (
            <ul className="py-1 m-0 list-none">
              {options.map((option) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-[var(--dash-surface-muted)] transition-colors flex items-center justify-between ${
                    String(value) === String(option.value)
                      ? "bg-[var(--dash-primary)]/10 text-[var(--dash-primary)] font-medium"
                      : "text-[var(--dash-text)]"
                  }`}
                >
                  <span className="truncate pr-2">{option.label}</span>
                  {String(value) === String(option.value) && <MdCheck className="shrink-0" size={16} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
