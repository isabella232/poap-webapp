import React, { FC, useState, useEffect, useMemo } from 'react';
import { useToasts } from 'react-toast-notifications';
import { Formik, Form, FormikActions } from 'formik';

/* Helpers */
import { WebsiteSchema } from '../../lib/schemas';
import {
  Website,
  getWebsiteByEventIdAndSecretCode,
  createWebsite,
  updateWebsite,
  getActiveQrRequests,
  getEventById,
  PoapEvent,
} from '../../api';

/* Components */
import { SubmitButton } from '../../components/SubmitButton';
import { EventField, QrRequestModal } from '../EventsPage';
import { Loading } from '../../components/Loading';
import DatePicker, { DatePickerDay, SetFieldValue } from '../../components/DatePicker';
import { format, isAfter } from 'date-fns';
import FormFilterReactSelect from '../../components/FormFilterReactSelect';
import { timezones } from '../Checkouts/_helpers/Timezones';
import ReactModal from 'react-modal';
import { Tooltip } from 'react-lightweight-tooltip';

/* Types */
type WebsiteFormType = {
  claimName: string;
  timezone: number;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  captcha: boolean;
  active: boolean;
  codesQuantity: number;
};

type WebsiteFormProps = {
  eventId: number;
  secretCode?: number;
  maybeEvent?: PoapEvent;
};

const WebsiteForm: FC<WebsiteFormProps> = ({ eventId, secretCode, maybeEvent }) => {
  /* State */
  const [website, _setWebsite] = useState<Website | null>(null);
  const [activeWebsite, setActiveWebsite] = useState<boolean>(true);
  const [activeCaptcha, setActiveCaptcha] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isActiveQrRequest, setIsActiveQrRequest] = useState<boolean>(false);
  const [edit, setEdit] = useState<boolean>(false);
  const [isFetchingWebsite, setIsFetchingWebsite] = useState<boolean>(true);
  const [isExpiredEvent, setIsExpiredEvent] = useState<boolean>(false);

  const parseDate = (date: string, time: string, timezone: number): Date => {
    const timezoneString = ('00' + Math.abs(timezone)).slice(-2) + '00';
    const dateString = `${date}T${time}${timezone >= 0 ? `+${timezoneString}` : `-${timezoneString}`}`;
    return new Date(dateString);
  };

  const formatDate = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  const formatTime = (date: Date): string => {
    return format(date, 'hh:mm');
  };

  const setWebsite = (website?: Website): void => {
    if (website) {
      _setWebsite(website);
      setActiveWebsite(website.active);
      setActiveCaptcha(website.captcha);
      setEdit(true);
    } else {
      setEdit(false);
    }
  };

  const initialValues = useMemo(() => {
    let values: WebsiteFormType = {
      claimName: '',
      active: true,
      captcha: false,
      start_date: '',
      start_time: '',
      timezone: 0,
      end_date: '',
      end_time: '',
      codesQuantity: 0,
    };

    if (website) {
      const from = new Date(website.from);
      const to = new Date(website.to);

      values = {
        claimName: website.claim_name,
        timezone: 0,
        start_date: formatDate(from),
        start_time: formatTime(from),
        end_date: formatDate(to),
        end_time: formatTime(to),
        active: website.active,
        captcha: website.captcha,
        codesQuantity: 1,
      };
    }
    return values;
  }, [website]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Libraries */
  const { addToast } = useToasts();

  /* Effects */
  useEffect(() => {
    setIsFetchingWebsite(true);
    if (maybeEvent) {
      setIsExpiredEvent(isAfter(new Date(), new Date(maybeEvent.expiry_date)));
    } else {
      fetchEvent().then();
    }

    checkActiveQrRequest(eventId).then();

    fetchWebsite().then(() => {
      setIsFetchingWebsite(false);
    });
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Data functions */
  const fetchEvent = async () => {
    try {
      const _event = await getEventById(eventId);
      if (_event) {
        setIsExpiredEvent(isAfter(new Date(), new Date(_event.expiry_date)));
      } else {
        addToast('Error while fetching event', {
          appearance: 'error',
          autoDismiss: false,
        });
      }
    } catch (e) {
      addToast('Error while fetching event', {
        appearance: 'error',
        autoDismiss: false,
      });
    }
  };

  const fetchWebsite = async () => {
    try {
      const _website = await getWebsiteByEventIdAndSecretCode(eventId, secretCode);
      setWebsite(_website);
    } catch (e) {
      //do nothing
    }
  };

  const handleDayClick = (day: Date, dayToSetup: DatePickerDay, setFieldValue: SetFieldValue) => {
    setFieldValue(dayToSetup, formatDate(day));
  };

  const toggleActiveWebsite = () => setActiveWebsite(!activeWebsite);
  const toggleActiveCaptcha = () => setActiveCaptcha(!activeCaptcha);

  // Edition Loading Component
  if (edit && !website) {
    return (
      <div className={'bk-container'}>
        <h2>Edit Website</h2>
        <Loading />
      </div>
    );
  }

  //Submit form
  const onSubmit = async (submittedValues: WebsiteFormType, actions: FormikActions<WebsiteFormType>) => {
    try {
      const { claimName, start_date, start_time, end_date, end_time, timezone, codesQuantity } = submittedValues;

      const startDateTime: Date = parseDate(start_date, start_time, timezone);
      const endDateTime: Date = parseDate(end_date, end_time, timezone);

      if (startDateTime && endDateTime && isAfter(startDateTime, endDateTime)) {
        addToast('Start date & time should be before End date & time', {
          appearance: 'error',
          autoDismiss: true,
        });
        actions.setSubmitting(false);
        return;
      }

      try {
        if (!edit) {
          await createWebsite(
            eventId,
            claimName,
            codesQuantity,
            startDateTime.toISOString(),
            endDateTime.toISOString(),
            activeCaptcha,
            activeWebsite,
            secretCode,
          );

          const website = await getWebsiteByEventIdAndSecretCode(eventId, secretCode);

          setWebsite(website);

          addToast('Website created correctly', {
            appearance: 'success',
            autoDismiss: true,
          });
        } else {
          await updateWebsite(
            eventId,
            claimName,
            startDateTime.toISOString(),
            endDateTime.toISOString(),
            activeCaptcha,
            activeWebsite,
            secretCode,
          );

          addToast('Website updated correctly', {
            appearance: 'success',
            autoDismiss: true,
          });
        }

        actions.setSubmitting(false);
      } catch (e) {
        let _msg: React.ReactNode | string = e.message;
        addToast(_msg, {
          appearance: 'error',
          autoDismiss: false,
        });
        actions.setSubmitting(false);
      }
    } catch (err) {
      actions.setSubmitting(false);
      addToast(err.message, {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  };

  const handleQrRequestModalRequestClose = (): void => {
    setIsQrModalOpen(false);
  };

  const handleQrRequestModalClick = (): void => {
    setIsQrModalOpen(true);
  };

  //todo check if this is working for websites
  const checkActiveQrRequest = async (id: number) => {
    const { active } = await getActiveQrRequests(id);
    if (active > 0) {
      setIsActiveQrRequest(true);
    } else {
      setIsActiveQrRequest(false);
    }
  };

  return (
    <>
      {/*Modals*/}
      <ReactModal
        isOpen={isQrModalOpen}
        onRequestClose={handleQrRequestModalRequestClose}
        shouldFocusAfterRender={true}
        shouldCloseOnEsc={true}
        shouldCloseOnOverlayClick={true}
        style={{ content: { overflow: 'visible' } }}
      >
        <QrRequestModal
          eventId={eventId}
          secretCode={secretCode}
          isWebsitesRequest={true}
          handleModalClose={handleQrRequestModalRequestClose}
          setIsActiveQrRequest={checkActiveQrRequest}
        />
      </ReactModal>
      {/*End Modals*/}
      <div className={'bk-container'}>
        {!isFetchingWebsite && (
          <Formik
            initialValues={initialValues}
            enableReinitialize
            validateOnBlur={false}
            validateOnChange={false}
            validationSchema={WebsiteSchema}
            onSubmit={onSubmit}
          >
            {({ values, errors, isSubmitting, setFieldValue }) => {
              const handleSelectChange = (name: string) => (selectedOption: any) =>
                setFieldValue(name, selectedOption.value);

              let startDateLimit =
                values.end_date !== ''
                  ? {
                      from: new Date(new Date(values.end_date).setHours(0, 0, 0, 0)),
                      to: new Date('2030-01-01'),
                    }
                  : undefined;

              let endDateLimit =
                values.start_date !== ''
                  ? {
                      from: new Date('2021-01-01'),
                      to: new Date(new Date(values.start_date).setHours(23, 59, 59, 999)),
                    }
                  : undefined;

              return (
                <Form className={'website-admin-form'}>
                  <h2>{edit ? 'Edit Website' : 'Create Website'} </h2>
                  <h3>General Info</h3>
                  <div>
                    <div className={'col-xs-12'}>
                      <EventField title="Website Name" name="claimName" />
                    </div>
                  </div>
                  <div className={'date-row'}>
                    <div className={'col-xs-12 col-md-4'}>
                      <DatePicker
                        text="Start Date"
                        dayToSetup="start_date"
                        handleDayClick={handleDayClick}
                        setFieldValue={setFieldValue}
                        placeholder={values.start_date}
                        value={values.start_date}
                        disabled={false}
                        disabledDays={startDateLimit}
                      />
                      <EventField disabled={false} title="" name="start_time" type="time" />
                    </div>
                    <div className={'col-xs-12  col-md-4'}>
                      <DatePicker
                        text="End Date"
                        dayToSetup="end_date"
                        handleDayClick={handleDayClick}
                        setFieldValue={setFieldValue}
                        placeholder={values.end_date}
                        value={values.end_date}
                        disabled={false}
                        disabledDays={endDateLimit}
                      />
                      <EventField disabled={false} title="" name="end_time" type="time" />
                    </div>
                    <div className={'col-xs-12 col-md-4'} style={{ paddingBottom: '5px' }}>
                      <FormFilterReactSelect
                        label="Timezone"
                        name="timezone"
                        placeholder={''}
                        onChange={handleSelectChange('timezone')}
                        options={timezones}
                        disabled={false}
                        value={timezones?.find((option) => option.value === values['timezone'])}
                      />
                    </div>
                  </div>

                  {!edit && (
                    <div className={'date-row'}>
                      <div className={'col-xs-12'}>
                        <EventField title={'Requested Codes'} name={'codesQuantity'} type={'number'} disabled={edit} />
                      </div>
                    </div>
                  )}

                  {edit && (
                    <RequestMoreCodesButton
                      hasActiveQrRequest={isActiveQrRequest}
                      isExpiredEvent={isExpiredEvent}
                      onClick={handleQrRequestModalClick}
                    />
                  )}
                  <div>
                    <div className={'col-xs-8'}>
                      <div className={'checkbox-field'} onClick={toggleActiveWebsite}>
                        <input type="checkbox" checked={activeWebsite} readOnly name="website" />
                        <label>Active Website</label>
                      </div>
                    </div>

                    <div className={'col-xs-4'}>
                      <div className={'checkbox-field'} onClick={toggleActiveCaptcha}>
                        <input type="checkbox" checked={activeCaptcha} readOnly name="captcha" />
                        <label>Captcha Activated</label>
                      </div>
                    </div>
                  </div>

                  <div className={'col-md-12'}>
                    <SubmitButton text="Submit" isSubmitting={isSubmitting} canSubmit={true} />
                  </div>
                </Form>
              );
            }}
          </Formik>
        )}
        {isFetchingWebsite && <Loading />}
      </div>
    </>
  );
};

type RequestMoreCodesButtonProps = {
  hasActiveQrRequest: boolean;
  isExpiredEvent: boolean;
  onClick: () => void;
};

const RequestMoreCodesButton: FC<RequestMoreCodesButtonProps> = ({ hasActiveQrRequest, isExpiredEvent, onClick }) => {
  const tooltipMessage = (
    <div key={'1'} className={'backoffice-tooltip'}>
      {!isExpiredEvent ? (
        <>A request for this event is being processed</>
      ) : (
        <>You can't request codes on an expired event</>
      )}
    </div>
  );

  const disabled = (): boolean => {
    return hasActiveQrRequest || isExpiredEvent;
  };

  return disabled() ? (
    <Tooltip content={[tooltipMessage]}>
      <button
        disabled={true}
        type="button"
        className={'filter-base filter-button disabled'}
        style={{
          width: '100%',
          cursor: 'not-allowed',
        }}
      >
        Request more codes
      </button>
    </Tooltip>
  ) : (
    <button type="button" className={'filter-base filter-button'} onClick={onClick}>
      Request more codes
    </button>
  );
};

export default WebsiteForm;
