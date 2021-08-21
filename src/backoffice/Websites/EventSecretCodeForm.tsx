import React, { useMemo, useState } from 'react';
import { PoapEvent } from '../../api';
import { Field, Form, Formik } from 'formik';
import { Loading } from '../../components/Loading';
import FilterReactSelect from '../../components/FilterReactSelect';
import { OptionTypeBase } from 'react-select';
import CloseIcon from '../../images/x.svg';

type EventSecretCodeForm = {
  onSubmit: (eventId: number, secretCode?: number) => void;
  events: PoapEvent[];
  loading: boolean;
  error?: string;
  askSecretCode?: boolean;
  onClose?: () => void;
};

export const EventSecretCodeForm: React.FC<EventSecretCodeForm> = ({
  events,
  error,
  loading,
  onSubmit,
  askSecretCode,
  onClose,
}) => {
  const [mode, setMode] = useState<string>('name');

  const handleAuthenticationModalSubmit = (values: AuthenticationModalFormikValues, props: any) => {
    onSubmit(values.eventId || 0, values.secretCode);
    props.resetForm();
  };

  const eventOptions = useMemo<OptionTypeBase[]>(() => {
    return events.map((event) => {
      const label = `${event.name ? event.name : 'No name'} (${event.fancy_id}) - ${event.year}`;
      return { value: event.id, label: label, start_date: event.start_date };
    });
  }, [events]);

  type AuthenticationModalFormikValues = {
    eventId?: number;
    secretCode?: number;
  };

  return (
    <Formik
      initialValues={{}}
      validateOnBlur={false}
      validateOnChange={false}
      onSubmit={handleAuthenticationModalSubmit}
    >
      {({ values }) => {
        return (
          <Form className={'auth-modal-container'}>
            {loading && <Loading />}
            {!loading && (
              <>
                <button type="button" className="close" onClick={onClose}>
                  <img src={CloseIcon} alt={'close'} className="close-icon" />
                </button>
                <select
                  className={'filter-by'}
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                  }}
                >
                  <option value="name">Search Event by Name</option>
                  <option value="id">Search Event by Event Id</option>
                </select>
                {mode === 'name' && (
                  <FilterReactSelect
                    options={eventOptions}
                    placeholder={mode === 'name' && error ? error : 'Select Event'}
                    onChange={(option: OptionTypeBase) => {
                      values.eventId = option.value;
                    }}
                    menuPortalTarget={document.body}
                    controlStyles={{ marginBottom: '24px' }}
                    placeholderStyles={{ color: error ? '#F76278' : undefined }}
                  />
                )}
                {mode === 'id' && (
                  <Field
                    id={'eventId'}
                    name={'eventId'}
                    values={values.eventId || ''}
                    type={'number'}
                    className={'field ' + (error ? 'modal-input-error' : '')}
                    placeholder={error ? error : 'Event Id'}
                    value={values.eventId}
                  />
                )}
                {askSecretCode && (
                  <Field
                    id={'secretCode'}
                    name={'secretCode'}
                    value={values.secretCode || ''}
                    type={'number'}
                    className={'field ' + (error ? 'modal-input-error' : '')}
                    placeholder={error ? error : 'Edit Code'}
                  />
                )}
              </>
            )}
            <button className="filter-base filter-button" style={{ width: '100%' }} type="submit" disabled={loading}>
              Submit Authentication
            </button>
          </Form>
        );
      }}
    </Formik>
  );
};
