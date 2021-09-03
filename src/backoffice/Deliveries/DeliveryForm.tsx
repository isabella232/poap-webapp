import React, { FC, useState, useEffect, useMemo } from 'react';
import { generatePath, RouteComponentProps, useHistory } from 'react-router-dom';
import { AddToast, useToasts } from 'react-toast-notifications';
import { Formik, Form, FormikActions, FormikErrors } from 'formik';
import delve from 'dlv';

/* Helpers */
import { DeliverySchema } from '../../lib/schemas';
import {
  Delivery,
  DeliveryAddress,
  PoapEvent,
  getEvents,
  getDelivery,
  getDeliveryAddresses,
  createDelivery,
  updateDelivery, addDeliveryAddresses,
} from '../../api';

/* Components */
import AddressesList from './AddressesList';
import { SubmitButton } from '../../components/SubmitButton';
import { EventField } from '../EventsPage';
import { Loading } from '../../components/Loading';
import { authClient } from '../../auth';
import { ROUTES } from '../../lib/constants';
import { useAsyncDebounce } from 'react-table';
import ReactPaginate from "react-paginate";

/* Types */
type PaginateAction = {
  selected: number;
};

type DeliveryFormType = {
  slug: string;
  event_ids: string[];
  card_title: string;
  card_text: string;
  page_title: string;
  page_text: string;
  metadata_title: string;
  metadata_description: string;
  image: string;
  page_title_image: string;
  edit_codes: string[]
};

const DeliveryForm: FC<RouteComponentProps> = (props) => {
  const id = delve(props, 'match.params.id');
  const isEdition: boolean = !!id;

  /* State */
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [addressesPage, setAddressesPage] = useState<number>(0);
  const [addressesTotal, setAddressesTotal] = useState<number>(0);
  const [addressesLimit, setAddressesLimit] = useState<number>(10);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [addressesError, setAddressesError] = useState<string>('');
  const [eventIdsError, setEventIdsError] = useState<string>('');
  const [listInput, setListInput] = useState<string>('');
  const [events, setEvents] = useState<PoapEvent[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<boolean>(true);
  const [addingAddresses, setAddingAddresses] = useState<boolean>(false);
  const [eventsAmount, setEventsAmount] = useState(1);
  const [isSubmittingAddresses, setIsSubmittingAddresses] = useState<boolean>(false)
  const eventsLimit = 5
  const canEdit = !(delivery && delivery.approved !== undefined && delivery.approved) || authClient.isAuthenticated()

  const addEvent = () => {
    setEventsAmount(eventsAmount + 1)
  }
  const removeEvent = () => {
    if (eventsAmount > 1) setEventsAmount(eventsAmount - 1)
  }

  const initialValues = useMemo(() => {
    if (delivery) {
      const values: DeliveryFormType = {
        slug: delivery.slug,
        event_ids: delivery.event_ids.split(','),
        card_title: delivery.card_title,
        card_text: delivery.card_text,
        page_title: delivery.page_title,
        page_text: delivery.page_text,
        metadata_title: delivery.metadata_title,
        metadata_description: delivery.metadata_description,
        image: delivery.image,
        page_title_image: delivery.page_title_image,
        edit_codes: Array.from(Array(delivery.event_ids.split(',').length).keys()).map(_ => '')
      };
      setEventsAmount(values.event_ids.length)
      return values;
    } else {
      const values: DeliveryFormType = {
        slug: '',
        event_ids: Array.from(Array(eventsAmount).keys()).map(_ => ''),
        card_title: '',
        card_text: '',
        page_title: '',
        page_text: '',
        metadata_title: '',
        metadata_description: '',
        image: '',
        page_title_image: '',
        edit_codes: Array.from(Array(eventsAmount).keys()).map(_ => '')
      };
      return values;
    }
  }, [delivery]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Libraries */
  const { addToast } = useToasts();
  const history = useHistory()
  const [reRenderOnNewDelivery, setReRenderOnNewDelivery] = useState<boolean>(false)

  /* Effects */
  useEffect(() => {
    if (isEdition) {
      fetchDelivery().then();
    }
    fetchEvents().then();
  }, [reRenderOnNewDelivery]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (addresses.length > 0){
      fetchDeliveryAddresses().then();
    }
  }, [addressesPage]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Data functions */
  const fetchDelivery = async () => {
    try {
      const _delivery = await getDelivery(id);
      setDelivery(_delivery);
      setActiveDelivery(_delivery.active);
      await fetchDeliveryAddresses();
    } catch (e) {
      addToast('Error while fetching delivery', {
        appearance: 'error',
        autoDismiss: false,
      });
    }
  };
  const fetchDeliveryAddresses = async () => {
    const _addresses = await getDeliveryAddresses(id, addressesLimit, addressesPage * addressesLimit);
    setAddresses(_addresses.items);
    setAddressesTotal(_addresses.total);
  }

  const fetchEvents = async () => {
    try {
      const events = await getEvents();
      setEvents(events);
    } catch (e) {
      addToast('Error while fetching events', {
        appearance: 'error',
        autoDismiss: false,
      });
    }
  };
  const cleanAddresses = (addresses: string, event_ids: string[]) => {
    const clean_addresses = [];
    try {
      const _addresses = addresses.split(/\n/);
      let ctr = 0;
      for (let each of _addresses) {
        ctr++;
        if (each === '') continue
        // Split by ;
        let parts = each.split(';');
        if (parts.length > 2) {
          setAddressesError(`Line ${ctr} is incorrectly formed!`);
          return null;
        }
        let _events: number[] = [];
        if (parts.length === 2 && parts[1].trim() !== '') {
          _events = parts[1].split(',').map((e) => parseInt(e, 10));
        } else {
          _events = event_ids.map((e) => parseInt(e, 10));
        }
        // Split by ,
        clean_addresses.push({
          address: parts[0],
          events: _events.filter((e) => !isNaN(e)),
        });
      }
      return clean_addresses;
    } catch (e) {
      console.log('Error parsing addresses');
      console.log(e);
      setAddressesError('Unexpected error parsing addresses list');
      return null;
    }
  }

  /* UI Manipulation */
  const handleListChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
    setListInput(ev.target.value);
  };
  const toggleActiveDelivery = () => setActiveDelivery(!activeDelivery);
  const showError = (e: any) => {
    let _msg: React.ReactNode | string = e.message;
    try {
      if (e.message.startsWith('[')) {
        let errors = JSON.parse(e.message);
        _msg = (
          <>
            {errors.map((e: string) => (
              <p>&bull; {e}</p>
            ))}
          </>
        );
      }
    } catch (e) {
      console.log('Error parsing error > ', e);
    }
    addToast(_msg, {
      appearance: 'error',
      autoDismiss: false,
    });
  }
  const refreshAddresses = async () => {
    try {
      setAddressesPage(0);
      await fetchDeliveryAddresses();
    } catch (e) {
      addToast('Error while refreshing addresses. '+e, {
        appearance: 'error',
        autoDismiss: false,
      });
    }
  }

  const handlePageChange = (obj: PaginateAction) => setAddressesPage(obj.selected);

  // Edition Loading Component
  if (isEdition && !delivery) {
    return (
      <div className={'bk-container'}>
        <h2>Edit Delivery</h2>
        <Loading />
      </div>
    );
  }

  return (
    <div className={'bk-container'}>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validateOnBlur={false}
        validateOnChange={false}
        validationSchema={DeliverySchema}
        onSubmit={async (submittedValues: DeliveryFormType, actions: FormikActions<DeliveryFormType>) => {
          try {
            if (!listInput && !isEdition) {
              setAddressesError('An address list is required');
              addToast(`An address list is required`, {
                appearance: 'error',
                autoDismiss: true,
              });
              actions.setSubmitting(false);
              return;
            }
            setAddressesError('');

            const {
              slug,
              event_ids,
              card_title,
              card_text,
              page_title,
              page_text,
              metadata_title,
              metadata_description,
              image,
              page_title_image,
              edit_codes
            } = submittedValues;

            if (!authClient.isAuthenticated() && event_ids.length !== edit_codes.length) {
              setEventIdsError('Every event id must have a matching edit code')
              addToast(`Every event id must have a matching edit code`, {
                appearance: 'error',
                autoDismiss: true,
              });
              actions.setSubmitting(false);
              return;
            }
            if (event_ids.length === 0) {
              setEventIdsError('At least one event need to be linked to the delivery')
              addToast(`At least one event need to be linked to the delivery`, {
                appearance: 'error',
                autoDismiss: true,
              });
              actions.setSubmitting(false);
              return;
            }
            setEventIdsError('')

            const clean_addresses = cleanAddresses(listInput, event_ids);
            if (!clean_addresses) {
              addToast(`Error parsing addresses. Check the format and try again`, {
                appearance: 'error',
                autoDismiss: true,
              });
              actions.setSubmitting(false);
              return;
            }

            try {
              if (!isEdition) {
                createDelivery(
                  slug,
                  event_ids.join(','),
                  card_title,
                  card_text,
                  page_title,
                  page_text,
                  metadata_title,
                  metadata_description,
                  image,
                  page_title_image,
                  edit_codes.join(','),
                  clean_addresses,
                ).then((delivery) => {
                  addToast(`Created delivery succesfully!`, {
                    appearance: 'success',
                    autoDismiss: true,
                  });
                  actions.setSubmitting(false)
                  const id = delivery.id
                  history.push(generatePath(ROUTES.deliveries.editForm.path, { id }))
                  setReRenderOnNewDelivery(!reRenderOnNewDelivery) // change state to force rerender
                }).catch((e) => {
                  addToast('Error creating delivery. '+e.message, {
                    appearance: 'error',
                    autoDismiss: true,
                  });
                  actions.setSubmitting(false);
                });
              } else {
                if (canEdit) {
                  updateDelivery(
                    id,
                    slug,
                    card_title,
                    card_text,
                    page_title,
                    page_text,
                    metadata_title,
                    metadata_description,
                    image,
                    page_title_image,
                    event_ids.join(','),
                    edit_codes.join(','),
                    activeDelivery,
                  ).then((_) => {
                    addToast(`Updated delivery succesfully!`, {
                      appearance: 'success',
                      autoDismiss: true,
                    });
                    setListInput('')
                    actions.setSubmitting(false)
                  }).catch((e) => {
                    addToast('Error updating delivery. '+e.message, {
                      appearance: 'error',
                      autoDismiss: true,
                    });
                    if (e.toString().includes('Incorrect Edit Code')) {
                      edit_codes.forEach((v, i) => actions.setFieldError(`edit_codes[${i}]`, 'Incorrect edit code'))
                    }
                    actions.setSubmitting(false);
                  });
                } else {
                  addToast(`Delivery already approved, can't modify`, {
                    appearance: 'info',
                    autoDismiss: true,
                  });
                  actions.setSubmitting(false);
                }
              }
            } catch (e) {
              showError(e)
              actions.setSubmitting(false);
            }
          } catch (err) {
            addToast(err.message, {
              appearance: 'error',
              autoDismiss: true,
            });
            actions.setSubmitting(false);
          }
        }}
      >
        {({ values, isSubmitting, isValid, errors, submitCount}) => {
          const addressPlaceholder = `address/ENS;id1,id2,id3   or   address/ENS (for all events)`;

          return (
            <><Form className={'delivery-admin-form'}>
              <SubmissionErrorToast submitCount={submitCount} addToast={addToast} errors={errors} isValid={isValid} isSubmitting={isSubmitting} />
              <h2>{isEdition ? 'Edit' : 'Create'} Delivery</h2>

              <div>
                <h3>General Info</h3>
              </div>
              <IDandCodeFields isEdition={isEdition} length={eventsAmount} />
              {eventIdsError && <p className={'bk-error'} style={{marginTop: 4}}>{eventIdsError}</p>}
              {!isEdition && eventsAmount < eventsLimit &&
                <div style={{display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20}}>
                  <button type='button' className={'btn small'} style={{margin: 0}} onClick={addEvent}>Add another event</button>
                  <button type='button' className={'btn small red'} style={{margin: 0}} onClick={removeEvent}>Remove last event</button>
                </div>
              }
              <div>
                <div className={'col-xs-6'}>
                  <EventField title="Delivery URL" name="slug" disabled={!canEdit} />
                </div>
              </div>
              <div>
                <h3>Home Page Card</h3>
                <div className={'col-xs-12'}>
                  <EventField title="Card Title" name="card_title" disabled={!canEdit} />
                </div>
                <div className={'col-xs-12'}>
                  <EventField title="Card Text" name="card_text" disabled={!canEdit} type="textarea" />
                </div>
              </div>
              <div>
                <h3>Delivery Page</h3>
                <div className={'col-xs-12'}>
                  <EventField title="Page Title" name="page_title" disabled={!canEdit} />
                </div>
                <div className={'col-xs-12'}>
                  <EventField title="Page Text" name="page_text" disabled={!canEdit} type="textarea" />
                </div>
              </div>
              <div>
                <h3>Page metadata</h3>
                <div className={'col-xs-12'}>
                  <EventField title="Metadata title" name="metadata_title" disabled={!canEdit} />
                </div>
                <div className={'col-xs-12'}>
                  <EventField title="Metadata Description" name="metadata_description" disabled={!canEdit} type="textarea" />
                </div>
              </div>
              <div>
                <h3>Images</h3>
                <div className={'col-xs-6'}>
                  <EventField title="Image URL" name="image" disabled={!canEdit} />
                </div>
                <div className={'col-xs-6'}>
                  <EventField title="Page Title image" name="page_title_image" disabled={!canEdit} />
                </div>
              </div>
              {isEdition &&
                <button
                  className={`btn small ${addingAddresses ? 'red' : ''}`}
                  type='button'
                  onClick={() => {setAddingAddresses(!addingAddresses)}}
                >
                  {addingAddresses ? 'Close add' : 'Add'} addresses
                </button>
              }
              {(!isEdition || addingAddresses) && (
                <div>
                  <h3>{`${addingAddresses ? 'Add ':''}`}Addresses</h3>
                  {addingAddresses && <h4>The only prerequisite to add addresses is to write the edit codes above</h4>}
                  <div className={'col-xs-12'}>
                    <div className="bk-form-row">
                      <label>List of addresses for Delivery</label>
                      <textarea
                        placeholder={addressPlaceholder}
                        className={`${addressesError ? 'error' : ''}`}
                        value={listInput}
                        onChange={handleListChange}
                      />
                      {addressesError && <p className={'bk-error'}>{addressesError}</p>}
                    </div>
                  </div>
                  {addingAddresses &&
                    <SubmitButton
                      className={'btn small'}
                      type='button'
                      text={'Submit add addresses'}
                      isSubmitting={isSubmittingAddresses}
                      canSubmit={addingAddresses}
                      onClick={() => {
                        try {
                          setIsSubmittingAddresses(true)
                          if (!listInput) {
                            setAddressesError('An address list is required');
                            setIsSubmittingAddresses(false)
                            return;
                          }
                          if (!authClient.isAuthenticated()) {
                            if (values.edit_codes.find(code => code === "") !== undefined) {
                              setAddressesError('Edit codes (above) must be filled as a way of authenticating')
                              setIsSubmittingAddresses(false)
                              return;
                            } else if (values.edit_codes.find(code => code && (code.length !== 6 || !(/^\d+$/.test(code)))) !== undefined) {
                              setAddressesError('All edit codes must be 6 digit numbers')
                              setIsSubmittingAddresses(false)
                              return;
                            }
                          }
                          setAddressesError('');

                          const clean_addresses = cleanAddresses(listInput, values.event_ids);
                          if (!clean_addresses) {
                            addToast(`Error parsing addresses. Check the format and try again`, {
                              appearance: 'error',
                              autoDismiss: true,
                            });
                            setIsSubmittingAddresses(false)
                            return;
                          }

                          try {
                            addDeliveryAddresses(
                              id,
                              values.event_ids.join(','),
                              values.edit_codes.join(','),
                              clean_addresses
                            ).then((_) => {
                              addToast('Addresses added successfully', {
                                appearance: 'success',
                                autoDismiss: true,
                              });
                              setAddingAddresses(false);
                              setIsSubmittingAddresses(false)
                              setListInput('')
                              refreshAddresses()
                            }).catch((err) => {
                              addToast('Error adding addresses. \n'+err.message, {
                                appearance: 'error',
                                autoDismiss: true,
                              });
                              setIsSubmittingAddresses(false)
                            });
                          } catch (e) {
                            showError(e)
                            setIsSubmittingAddresses(false)
                          }
                        } catch (err) {
                          addToast(err.message, {
                            appearance: 'error',
                            autoDismiss: true,
                          });
                          setIsSubmittingAddresses(false)
                        }
                      }} />
                  }
                </div>
              )}
              {isEdition && (
                <div className={'col-md-12'}>
                  <div className={'checkbox-field'} onClick={toggleActiveDelivery}>
                    <input type="checkbox" checked={activeDelivery} disabled={!canEdit} readOnly />
                    <label>Active delivery</label>
                  </div>
                </div>
              )}
              <div className={'col-md-12'}>
                <SubmitButton text={isEdition ? 'Save changes' : 'Create delivery'} isSubmitting={isSubmitting} type='submit' canSubmit={true} />
              </div>
            </Form>
            {isEdition && addresses && events && <AddressesList
              events={events}
              addresses={addresses} />}
              {addressesTotal > addressesLimit && (
                <div className={'pagination'}>
                  <ReactPaginate
                    pageCount={Math.ceil(addressesTotal / addressesLimit)}
                    marginPagesDisplayed={2}
                    pageRangeDisplayed={5}
                    activeClassName={'active'}
                    onPageChange={handlePageChange}
                    forcePage={addressesPage}
                  />
                </div>
              )}
            </>
          );
        }}
      </Formik>
    </div>
  );
};

type IDandCodeFieldsProps = {
  isEdition: boolean;
  length: number;
};

const IDandCodeFields: FC<IDandCodeFieldsProps> = ({isEdition, length}) => {
  return (
    <>
      {Array.from(Array(length).keys()).map((key) => {
        return (
          <IDandCodeField
            key={key}
            isEdition={isEdition}
            fieldId={key}
          />
        );
      })}
    </>
  )
}

const IDandCodeField = ({isEdition = false, fieldId = -1}) => {
  return (
    <div>
      <div className={'col-xs-6'}>
        <EventField title="Event ID" disabled={isEdition} name={`event_ids[${fieldId}]`} />
      </div>
      <div className={'col-xs-6'}>
        <EventField title="Edit Code" name={`edit_codes[${fieldId}]`} />
      </div>
    </div>
  )
}

type SubmissionErrorToastProps = {
  submitCount: number;
  isValid: boolean;
  isSubmitting: boolean;
  errors: FormikErrors<DeliveryFormType>;
  addToast: AddToast;
};
const SubmissionErrorToast: FC<SubmissionErrorToastProps> = ({ submitCount, isValid, isSubmitting, errors, addToast }) => {
  const toastErrorDebounced = useAsyncDebounce(() => {
    let error_values = Object.values(errors)
    let error_values_flat: any[] = []
    error_values.forEach(v => Array.isArray(v) ? error_values_flat.push(...v) : error_values_flat.push(v))
    error_values_flat = error_values_flat.map(v => v+'. ')
    if (submitCount > 0 && !isValid) {
      addToast(error_values_flat, {
        appearance: 'error',
        autoDismiss: false,
      })
    }
  }, 500)
  useEffect(() => {
    toastErrorDebounced()
  }, [submitCount, isSubmitting, toastErrorDebounced]);
  return null;
}

export default DeliveryForm;
