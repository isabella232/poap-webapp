import { EventFilter, getPaginatedEvents, PaginatedEvent, PoapEvent, SortCondition, SortDirection } from 'api';
import { FieldProps } from 'formik';
import { OptionsType, OptionTypeBase } from 'react-select';
import AsyncSelect from 'react-select/async';
import React from 'react';
import { Option } from 'react-select/src/filters';


const DEFAULT_LIMIT = 100;
const DEFAULT_EMPTY_LABEL = 'Select an event';


const defaultSortCond: SortCondition = {
    sort_by: 'name',
    sort_direction: SortDirection.ascending
};

interface FilterReactSelectProps {
    placeholder: string;
    label?: string;
    name: string;
    disabled?: boolean;
    onChange?: (option?: OptionTypeBase | null) => void;
    value?: OptionTypeBase;
    className?: string;
    cacheOptions?: any;
    limit?: number;
    isMulti?: boolean;
    options?: OptionsType<Option>;
    styles?: any;
    filter?: EventFilter;
    showEmpty?: boolean;
    menuPortalTarget?: HTMLElement;
    controlStyles?: any;
    placeholderStyles?: any;
    toEventOption?: (event: PoapEvent) => OptionTypeBase;
};

type FormFilterReactSelectProps = FilterReactSelectProps & FieldProps;

export const colourStyles = {
    control: (styles: any) => ({
        ...styles,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#eef0fb',
        '&:hover': { borderColor: '#6534ff' },
    }),
    input: (styles: any) => ({ ...styles, height: 36 }),
};

const defaultConverter = (event: PoapEvent) => ({
    value: event.id,
    label: event.name
});

const EventSelect: React.FC<FilterReactSelectProps> = ({
    placeholder,
    label,
    name,
    disabled,
    onChange,
    value,
    className,
    cacheOptions,
    isMulti,
    styles,
    filter,
    toEventOption,
    showEmpty,
    menuPortalTarget,
    controlStyles,
    placeholderStyles,
    limit = DEFAULT_LIMIT,
}) => {

    const convertEventsToOptions = (paginatedEvents: PaginatedEvent) => {
        const cb = toEventOption ? toEventOption : defaultConverter;
        return paginatedEvents.items.map<OptionTypeBase>(cb);
    };

    let _timeoutId: NodeJS.Timeout;

    const loadOptions = (inputValue: string, callback: (options: OptionTypeBase[]) => void) => {
        if (_timeoutId) {
            clearTimeout(_timeoutId);
        }

        _timeoutId = setTimeout(async () => {
            const finalFilter: EventFilter = {
                ...filter,
                name: inputValue ? inputValue : undefined
            };

            let paginatedEvents = await getPaginatedEvents(
                finalFilter,
                0,
                limit,
                defaultSortCond
            );
            let options = convertEventsToOptions(paginatedEvents);

            if (showEmpty) {
                options.splice(0, 0, {
                    label: DEFAULT_EMPTY_LABEL,
                    value: ''
                });
            }

            callback(options);
        }, 300);
    };

    return <AsyncSelect
        cacheOptions={cacheOptions}
        loadOptions={loadOptions}
        placeholder={placeholder}
        label={label}
        name={name}
        loadingMessage={({ inputValue }) => 'Loading events...'}
        disabled={disabled}
        isMulti={isMulti}
        onChange={onChange}
        value={value}
        className={className}
        controlStyles={controlStyles}
        placeholderStyles={placeholderStyles}
        defaultOptions
        styles={styles}
        menuPortalTarget={menuPortalTarget}
    />
};

export const FormEventSelect = ({ field, form, options, placeholder, filter, toEventOption, showEmpty }: FormFilterReactSelectProps) => {

    const onChange = (option?: OptionTypeBase | null) => {
        form.setFieldValue(field.name, option);
    };

    return (
        <EventSelect
            name={field.name}
            value={field.value}
            onChange={onChange}
            placeholder={placeholder}
            className={'rselect'}
            styles={colourStyles}
            filter={filter}
            toEventOption={toEventOption}
            showEmpty={showEmpty}
        />
    );
};

export default EventSelect;