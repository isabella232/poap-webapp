import React, { FC, useEffect, useState } from 'react';
import { getEvents, PoapEvent, validateEventAndSecretCode } from '../../api';
import { Field, Form, Formik } from 'formik';
import { authClient } from '../../auth';
import ReactModal from 'react-modal';
import WebsiteForm from './WebsiteForm';
import WebsitesList from './WebsitesList';
import { Loading } from '../../components/Loading';
import FilterReactSelect from '../../components/FilterReactSelect';
import { OptionTypeBase } from 'react-select';

const WebsitesManage: FC = () => {
  const [isAuthenticationModalOpen, setIsAuthenticationModalOpen] = useState<boolean>(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<boolean>(false);
  const [eventId, setEventId] = useState<number | undefined>(undefined);
  const [event, setEvent] = useState<PoapEvent | undefined>(undefined);
  const [secretCode, setSecretCode] = useState<number | undefined>(undefined);
  const [events, setEvents] = useState<PoapEvent[]>([]);

  const isAdmin = authClient.isAuthenticated();

  useEffect(() => {
    if (isAdmin) {
      setIsAuthenticationModalOpen(false);
    } else {
      fetchEvents().then();
    }
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  const fetchEvents = async (): Promise<void> => {
    setIsLoadingAuth(true);
    const _events = await getEvents();
    setEvents(_events);
    setIsLoadingAuth(false);
  };

  const handleAuthenticationSubmit = async (eventId: number, secretCode: string): Promise<void> => {
    setIsLoadingAuth(true);
    try {
      const secretCodeNumber = parseInt(secretCode);

      const isValid = await validateEventAndSecretCode(eventId, secretCodeNumber);

      if (isValid) {
        setIsAuthenticationModalOpen(false);
        setSecretCode(secretCodeNumber);
        setEventId(eventId);
      } else {
        setAuthError(true);
        setIsLoadingAuth(false);
      }
    } catch (e) {
      setAuthError(true);
      setIsLoadingAuth(false);
    }
  };

  const handleWebsitesListCreateNewOrEdit = (event: PoapEvent): void => {
    setEvent(event);
    setEventId(event.id);
  };

  return (
    <div className={'admin-table'}>
      {/*Modals*/}
      <ReactModal
        isOpen={isAuthenticationModalOpen}
        shouldFocusAfterRender={true}
        shouldCloseOnEsc={false}
        shouldCloseOnOverlayClick={false}
      >
        <AuthenticationModal
          authenticationError={authError}
          onSubmit={handleAuthenticationSubmit}
          loading={isLoadingAuth}
          events={events}
        />
      </ReactModal>
      {/*End Modals*/}
      {isAdmin && !eventId && (
        <WebsitesList onCreateNew={handleWebsitesListCreateNewOrEdit} onEdit={handleWebsitesListCreateNewOrEdit} />
      )}
      {eventId && <WebsiteForm eventId={eventId} secretCode={secretCode} maybeEvent={event} />}
    </div>
  );
};

// authentication modal
type AuthenticationModalProps = {
  onSubmit: (eventId: number, secretCode: string) => void;
  authenticationError: boolean;
  loading: boolean;
  events: PoapEvent[];
};

type AuthenticationModalFormikValues = {
  secretCode: string;
  eventId: number;
};

const AuthenticationModal: React.FC<AuthenticationModalProps> = ({
  onSubmit,
  authenticationError,
  loading,
  events,
}) => {
  const handleAuthenticationModalSubmit = (values: AuthenticationModalFormikValues, props: any) => {
    onSubmit(values.eventId, values.secretCode);
    props.resetForm();
  };

  const eventOptions = () => {
    return events.map((event) => {
      const label = `${event.name ? event.name : 'No name'} (${event.fancy_id}) - ${event.year}`;
      return { value: event.id, label: label, start_date: event.start_date };
    });
  };

  return (
    <Formik
      initialValues={{
        secretCode: '',
        eventId: 0,
      }}
      validateOnBlur={false}
      validateOnChange={false}
      onSubmit={handleAuthenticationModalSubmit}
    >
      {({ values }) => {
        return (
          <Form className={'authentication-modal-container'}>
            {loading && <Loading />}
            {!loading && (
              <>
                <FilterReactSelect
                  options={eventOptions()}
                  placeholder={'Select Event'}
                  onChange={(option: OptionTypeBase) => {
                    values.eventId = option.value;
                  }}
                />
                <Field
                  id={'secretCode'}
                  name={'secretCode'}
                  type={'number'}
                  className={'field ' + (authenticationError ? 'modal-input-error' : '')}
                  placeholder={authenticationError ? 'The Edit Code entered is invalid' : 'Edit Code'}
                  style={{ paddingTop: '18px' }}
                />
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

export { WebsitesManage };
