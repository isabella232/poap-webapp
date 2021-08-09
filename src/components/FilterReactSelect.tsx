import React, { CSSProperties } from 'react';
import Select, { OptionTypeBase } from 'react-select';

type FilterReactSelectProps = {
  options: any;
  placeholder: string;
  onChange: (option: OptionTypeBase) => void;
  className?: string;
  menuPortalTarget?: HTMLElement | null;
  controlStyles?: CSSProperties;
  placeholderStyles?: CSSProperties;
};

const FilterReactSelect: React.FC<FilterReactSelectProps> = ({
  options,
  placeholder,
  onChange,
  className,
  menuPortalTarget,
  controlStyles,
  placeholderStyles,
}) => {
  const baseStyles = {
    control: (styles: any) => ({
      ...styles,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: 'white',
      '&:hover': { borderColor: '#6534ff' },
      ...controlStyles,
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    input: (styles: any) => ({
      ...styles,
      height: 36,
    }),
    placeholder: (base: any) => ({ ...base, ...placeholderStyles }),
  };

  return (
    <Select
      options={options}
      onChange={onChange}
      placeholder={placeholder}
      className={'rselect ' + (className || null)}
      styles={{ ...baseStyles, ...controlStyles }}
      menuPortalTarget={menuPortalTarget}
      menuPosition={'fixed'}
    />
  );
};

export default FilterReactSelect;
