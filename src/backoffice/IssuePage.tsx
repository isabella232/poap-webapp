import React from 'react';
import classNames from 'classnames';
import { OptionTypeBase, ValueType } from 'react-select';
import { ErrorMessage, Field, Form, Formik, FormikActions, FieldProps } from 'formik';

/* Helpers */
import { LAYERS } from '../lib/constants';
import { convertToGWEI } from '../lib/helpers';
import { IssueForEventFormValueSchema, IssueForUserFormValueSchema } from '../lib/schemas';
import { getSigners, mintEventToManyUsers, AdminAddress, PoapEvent, mintUserToManyEvents } from '../api';
/* Components */
import { SubmitButton } from '../components/SubmitButton';
import { Loading } from '../components/Loading';
import Transaction from '../components/Transaction';
import EventSelect, { colourStyles } from 'components/EventSelect';

interface IssueForEventPageState {
  initialValues: IssueForEventFormValues;
  signers: AdminAddress[];
  queueMessage: string;
  selectedEvent: number,
  loaded: boolean;
}

interface IssueForEventFormValues {
  eventId?: OptionTypeBase;
  addressList: string;
  signer: string;
}

export class IssueForEventPage extends React.Component<{}, IssueForEventPageState> {
  state: IssueForEventPageState = {
    initialValues: {
      addressList: '',
      signer: '',
    },
    selectedEvent: -1,
    signers: [],
    queueMessage: '',
    loaded: false,
  };

  async componentDidMount() {
    const signers = await getSigners();

    const signer = signers.length > 0 ? signers[0].signer : '';

    this.setState((old) => {
      return {
        ...old,
        initialValues: {
          ...old.initialValues,
          signer,
        },
        signers,
        loaded: true
      };
    });
  }

  onSubmit = async (values: IssueForEventFormValues, actions: FormikActions<IssueForEventFormValues>) => {
    let { selectedEvent } = this.state;
    if (selectedEvent < 0) {
      actions.setStatus({
        ok: false,
        msg: `Please, select event`,
      });
      return;
    }

    const addresses = values.addressList
      .trim()
      .split('\n')
      .map((adr) => adr.trim());

    let error = false;
    addresses.forEach((address) => {
      if (address.indexOf('.') === -1 && !address.match(/^0x[0-9a-fA-F]{40}$/)) error = true;
    });
    if (error) {
      actions.setStatus({
        ok: false,
        msg: `Not a valid address or ENS list`,
      });
      actions.setSubmitting(false);
      return;
    }

    const maxLimitAddress = 40;
    if (addresses.length > maxLimitAddress) {
      actions.setStatus({
        ok: false,
        msg: `Please, limit the list of addresses to ${maxLimitAddress}. Currently ${addresses.length}`,
      });
      actions.setSubmitting(false);
      return;
    }

    try {
      actions.setStatus(null);
      this.setState({ queueMessage: '' });
      const response = await mintEventToManyUsers(selectedEvent, addresses, values.signer);
      this.setState({ queueMessage: response.queue_uid });
      actions.setStatus({ ok: true });
    } catch (err) {
      actions.setStatus({
        ok: false,
        msg: `Mint Failed: ${err.message}`,
      });
    } finally {
      actions.setSubmitting(false);
    }
  };

  toLabel = (event: PoapEvent) => {
    const label = `#${event.id} - ${event.name ? event.name : 'No name'} (${event.fancy_id}) - ${event.year}`;
    return {
      value: event.id,
      label: label,
      start_date: event.start_date
    };
  };

  onSelectChange = (value: any): void => {
    if (value) {
      let selectedEvent = value.value;
      this.setState({ selectedEvent });
    }
  };

  render() {
    if (!this.state.loaded) {
      return <Loading />;
    }

    return (
      <div className={'bk-container'}>
        <Formik
          enableReinitialize
          initialValues={this.state.initialValues}
          onSubmit={this.onSubmit}
          validationSchema={IssueForEventFormValueSchema}
          render={({ dirty, isValid, isSubmitting, status }) => {
            return (
              <Form>
                <div className="bk-form-row">
                  <label htmlFor="eventId">Choose Event:</label>
                  <Field
                    component={EventSelect}
                    styles={colourStyles}
                    name={'eventId'}
                    onChange={this.onSelectChange}
                    placeholder={'Please, enter the event name'}
                    toEventOption={this.toLabel}
                    className={'rselect'}
                  />
                  <ErrorMessage name="eventId" component="p" className="bk-error" />
                </div>
                <div className="bk-form-row">
                  <label htmlFor="addressList">Beneficiaries Addresses</label>
                  <Field
                    name="addressList"
                    render={({ field, form }: FieldProps) => (
                      <textarea
                        rows={10}
                        cols={24}
                        placeholder="Write a list of addresses. Each Separated by a new line"
                        className={classNames(!!form.errors[field.name] && 'error')}
                        {...field}
                      />
                    )}
                  />
                  { }
                  <ErrorMessage name="addressList" component="p" className="bk-error" />
                  <br />
                </div>
                <div className="bk-form-row">
                  <label htmlFor="signer">Choose Address:</label>
                  <Field name="signer" component="select">
                    {this.state.signers.map((signer) => {
                      const label = `${signer.id} - ${signer.signer} (${signer.role}) - Pend: ${signer.pending_tx
                        } - Gas: ${convertToGWEI(signer.gas_price)}`;
                      return (
                        <option key={signer.id} value={signer.signer}>
                          {label}
                        </option>
                      );
                    })}
                  </Field>
                  <ErrorMessage name="signer" component="p" className="bk-error" />
                </div>
                {status && <div className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</div>}
                <SubmitButton text="Mint" isSubmitting={isSubmitting} canSubmit={isValid && dirty} />
              </Form>
            );
          }}
        />
        {this.state.queueMessage && <Transaction queueId={this.state.queueMessage} layer={LAYERS.layer2} />}
      </div>
    );
  }
}

interface IssueForUserPageState {
  initialValues: IssueForUserFormValues;
  signers: AdminAddress[];
  queueMessage: string;
  selectedEvents: number[];
}

interface IssueForUserFormValues {
  address: string;
  signer: string;
}

export class IssueForUserPage extends React.Component<{}, IssueForUserPageState> {
  state: IssueForUserPageState = {
    initialValues: {
      address: '',
      signer: '',
    },
    selectedEvents: [],
    signers: [],
    queueMessage: '',
  };

  async componentDidMount() {
    const signers = await getSigners();

    const signer = signers.length > 0 ? signers[0].signer : '';

    this.setState({ signers, initialValues: { ...this.state.initialValues, signer } });
  }

  onSelectChange = (value: ValueType<OptionTypeBase>): void => {
    if (Array.isArray(value)) {
      let selectedEvents = value.map((option) => option.value);
      this.setState({ selectedEvents });
    }
  };

  onSubmit = async (values: IssueForUserFormValues, actions: FormikActions<IssueForUserFormValues>) => {
    let { selectedEvents } = this.state;
    if (selectedEvents.length === 0) {
      actions.setStatus({
        ok: false,
        msg: `Please, select at least one event`,
      });
      return;
    }

    try {
      actions.setStatus(null);
      this.setState({ queueMessage: '' });
      const response = await mintUserToManyEvents(selectedEvents, values.address, values.signer);
      this.setState({ queueMessage: response.queue_uid });
      actions.setStatus({ ok: true });
    } catch (err) {
      actions.setStatus({
        ok: false,
        msg: `Mint Failed: ${err.message}`,
      });
    } finally {
      actions.setSubmitting(false);
    }
  };

  parseEvents = (events: PoapEvent[]): OptionTypeBase[] => {
    return events.map((event: PoapEvent) => {
      return { value: event.id, label: `${event.name} (${event.year})` };
    });
  };

  toLabel = (event: PoapEvent) => {
    const label = `#${event.id} - ${event.name ? event.name : 'No name'} (${event.fancy_id}) - ${event.year}`;
    return {
      value: event.id,
      label: label,
      start_date: event.start_date
    };
  };

  render() {
    let { signers, queueMessage, initialValues } = this.state;

    return (
      <div className={'bk-container'}>
        <div className="bk-form-row">
          <label htmlFor="event">Events</label>
          <EventSelect
            styles={colourStyles}
            name={'event'}
            // value={getValue()}
            onChange={this.onSelectChange}
            placeholder={'Select any amount of events'}
            className={'rselect'}
            toEventOption={this.toLabel}
            isMulti
          />
        </div>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          onSubmit={this.onSubmit}
          validationSchema={IssueForUserFormValueSchema}
          render={({ dirty, isValid, isSubmitting, status }) => {
            return (
              <Form>
                <div className="bk-form-row">
                  <label htmlFor="address">Beneficiary Address</label>
                  <Field
                    name="address"
                    render={({ field, form }: FieldProps) => (
                      <input
                        type="text"
                        placeholder="0x811a16ebf03c20d9333ff5321372d86da9ad1f2e"
                        className={classNames(!!form.errors[field.name] && 'error')}
                        {...field}
                      />
                    )}
                  />
                  <ErrorMessage name="address" component="p" className="bk-error" />
                </div>
                <div className="bk-form-row">
                  <label htmlFor="signer">Choose Address:</label>
                  <Field name="signer" component="select">
                    {signers.map((signer) => {
                      const label = `${signer.id} - ${signer.signer} (${signer.role}) - Pend: ${signer.pending_tx
                        } - Gas: ${convertToGWEI(signer.gas_price)}`;
                      return (
                        <option key={signer.id} value={signer.signer}>
                          {label}
                        </option>
                      );
                    })}
                  </Field>
                  <ErrorMessage name="signer" component="p" className="bk-error" />
                </div>
                {status && <div className={status.ok ? 'bk-msg-ok' : 'bk-msg-error'}>{status.msg}</div>}
                <SubmitButton text="Mint" isSubmitting={isSubmitting} canSubmit={isValid && dirty} />
              </Form>
            );
          }}
        />
        {queueMessage && <Transaction queueId={queueMessage} layer={LAYERS.layer2} />}
      </div>
    );
  }
}
