import React, { useState } from 'react';
import { EventFilter } from '../../api';
import { Field, Form, Formik } from 'formik';
import { Loading } from '../../components/Loading';
import { OptionTypeBase } from 'react-select';
import EventSelect, { colourStyles } from 'components/EventSelect';
import CloseIcon from '../../images/x.svg';


type EventSecretCodeForm = {
  onSubmit: (eventId: number, secretCode?: number) => void;
  loading: boolean;
  error?: string;
  askSecretCode?: boolean;
  onClose?: () => void;
};

export const EventSecretCodeForm: React.FC<EventSecretCodeForm> = ({
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

  type AuthenticationModalFormikValues = {
    eventId?: number;
    secretCode?: number;
  };

  const filter: EventFilter = {
    expired: false
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
                  <EventSelect
                    name="event"
                    filter={filter}
                    placeholder={mode === 'name' && error ? error : 'Select Event'}
                    onChange={(option?: OptionTypeBase | null) => {
                      values.eventId = option ? option.value : option;
                    }}
                    styles={{
                      ...colourStyles,
                      menuPortal: (styles: any) => ({
                        ...styles,
                        zIndex: '99999' 
                      })
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
