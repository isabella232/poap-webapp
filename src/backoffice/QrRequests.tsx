import React, { CSSProperties, FC, PropsWithChildren, useEffect, useState } from 'react';
import { OptionTypeBase } from 'react-select';

/* Libraries */
import ReactPaginate from 'react-paginate';
import ReactModal from 'react-modal';
import { Field, Formik } from 'formik';
import { useToasts } from 'react-toast-notifications';

/* Components */
import { Loading } from '../components/Loading';
import FilterSelect from '../components/FilterSelect';
import { SubmitButton } from '../components/SubmitButton';
import { Column, SortingRule, TableInstance, useExpanded, useSortBy, useTable } from 'react-table';
import { Link } from 'react-router-dom';

/* Helpers */
import {
  getQrRequests,
  PoapEvent,
  QrRequest,
  setQrRequests,
  SortCondition,
  SortDirection,
} from '../api';
import { format } from 'date-fns';
import { timeSince } from '../lib/helpers';
import { useWindowWidth } from '@react-hook/window-size/throttled';

/* Assets */
import edit from 'images/edit.svg';
import editDisable from 'images/edit-disable.svg';
import checked from '../images/checked.svg';
import error from '../images/error.svg';
import { ExpandedIcon, SortIcon } from './RequestsComponents';
import EventSelect, { colourStyles } from 'components/EventSelect';

type PaginateAction = {
  selected: number;
};

// creation modal types
type CreationModalProps = {
  handleModalClose: () => void;
  fetchQrRequests: () => void;
  qrRequest?: QrRequest;
};

type CreationModalFormikValues = {
  requested_codes: number;
};

const QrRequests: FC = () => {
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [isFetchingQrCodes, setIsFetchingQrCodes] = useState<boolean>(false);
  const [reviewedStatus, setReviewedStatus] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>(undefined);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState<boolean>(false);
  const [currentQrRequests, setCurrentQrRequests] = useState<QrRequest[]>([]);
  const [selectedQrRequest, setSelectedQrRequest] = useState<undefined | QrRequest>(undefined);
  const [sortCondition, setSortCondition] = useState<undefined | SortCondition>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  const width = useWindowWidth();

  useEffect(() => {
    fetchQrRequests();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    fetchQrRequests();
  }, [page]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    setPage(0);
    fetchQrRequests().then();
  }, [selectedEvent, reviewedStatus, limit, sortCondition, type]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const fetchQrRequests = async () => {
    setIsFetchingQrCodes(true);

    let event_id = undefined;
    if (selectedEvent !== undefined) event_id = selectedEvent > -1 ? selectedEvent : undefined;

    let _status = undefined;

    if (reviewedStatus) _status = reviewedStatus === 'reviewed';

    let website_request: boolean | undefined;

    switch (type) {
      case 'website':
        website_request = true;
        break;
      case 'qr':
        website_request = false;
        break;
      default:
        website_request = undefined;
        break;
    }

    const response = await getQrRequests(limit, page * limit, _status, event_id, sortCondition, website_request);
    const { qr_requests, total } = response;

    setTotal(total);
    setCurrentQrRequests(qr_requests);
    setIsFetchingQrCodes(false);
  };

  const handleSelectChange = (option?: OptionTypeBase | null): void => {
    setSelectedEvent(option ? option.value : option);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    setReviewedStatus(value);
  };

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    setLimit(parseInt(value, 10));
  };

  const handleCreationModalClick = (id: number): void => {
    const qr = currentQrRequests?.find((x) => x.id === id);
    setSelectedQrRequest(qr);
    setIsCreationModalOpen(true);
  };

  const handleCreationModalRequestClose = (): void => {
    setSelectedQrRequest(undefined);
    setIsCreationModalOpen(false);
  };

  const toEventOption = (event: PoapEvent) => {
    const label = `#${event.id} - ${event.name ? event.name : 'No name'} (${event.fancy_id}) - ${event.year}`;
    return {
      value: event.id,
      label: label,
      start_date: event.start_date
    };
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${timeSince(date)} ago`;
  };

  const handleOnSortChanged = (sortRules: SortingRule<QrRequestTableData>[]) => {
    if (!sortRules || sortRules.length < 1) return;
    const sortRule = sortRules[0];
    const sort_direction = sortRule.desc ? SortDirection.descending : SortDirection.ascending;
    const sortCondition: SortCondition = { sort_by: sortRule.id, sort_direction };
    setSortCondition(sortCondition);
  };

  const getTableData = (): QrRequestTableData[] => {
    return currentQrRequests.map((request) => {
      return {
        id: request.id,
        event: request.event,
        organizer: request.event.email,
        created_date: formatDate(request.created_date),
        reviewed_date: request.reviewed_date ? formatDate(request.reviewed_date) : '-',
        reviewed_by: request.reviewed ? request.reviewed_by : '-',
        reviewed: request.reviewed,
        amount: `${request.accepted_codes} / ${request.requested_codes}`,
        website_request: request.website_request,
      };
    });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    setType(value);
  };

  return (
    <div className={'admin-table qr'}>
      <h2>Manage Codes Requests</h2>
      <div className={'filters-container qr'}>
        <div className={'filter col-md-4'}>
          <div className="filter-option">
            <EventSelect
              name={'event'}
              styles={colourStyles}
              toEventOption={toEventOption}
              onChange={handleSelectChange}
              placeholder={'Filter by Event'} />
          </div>
        </div>
        <div className={'filter col-md-3 col-xs-6'}>
          <div className={'filter-group'}>
            <FilterSelect handleChange={handleStatusChange}>
              <option value="">Filter by reviewed</option>
              <option value="reviewed">Reviewed</option>
              <option value="false">Not Reviewed</option>
            </FilterSelect>
          </div>
        </div>
        <div className={'filter col-xs-6 col-md-3'}>
          <FilterSelect handleChange={handleTypeChange}>
            <option value="">Filter by type</option>
            <option value="website">Website Requests</option>
            <option value="qr">QR Requests</option>
          </FilterSelect>
        </div>
        <ReactModal
          isOpen={isCreationModalOpen}
          onRequestClose={handleCreationModalRequestClose}
          shouldFocusAfterRender={true}
          shouldCloseOnEsc={true}
          shouldCloseOnOverlayClick={true}
          style={{ content: { overflow: 'visible' } }}
        >
          <CreationModal
            qrRequest={selectedQrRequest}
            handleModalClose={handleCreationModalRequestClose}
            fetchQrRequests={fetchQrRequests}
          />
        </ReactModal>
      </div>
      <div className={'secondary-filters'}>
        <div className={'secondary-filters--pagination'}>
          Results per page:
          <select onChange={handleLimitChange}>
            <option value={10}>10</option>
            <option value={100}>100</option>
            <option value={1000}>1000</option>
          </select>
        </div>
      </div>

      {width > 990 ? (
        <QrRequestTable
          data={getTableData()}
          loading={isFetchingQrCodes}
          onEdit={handleCreationModalClick}
          onSortChange={handleOnSortChanged}
        />
      ) : (
        <QrRequestTableMobile
          data={getTableData()}
          loading={isFetchingQrCodes}
          onEdit={handleCreationModalClick}
          onSortChange={handleOnSortChanged}
        />
      )}

      {total > limit && (
        <div className={'pagination'}>
          <ReactPaginate
            pageCount={Math.ceil(total / limit)}
            marginPagesDisplayed={2}
            pageRangeDisplayed={5}
            activeClassName={'active'}
            onPageChange={handlePageChange}
            forcePage={page}
          />
        </div>
      )}

      {currentQrRequests && currentQrRequests.length === 0 && !isFetchingQrCodes && (
        <div className={'no-results'}>No QR Requests found</div>
      )}
    </div>
  );
};

const CreationModal: React.FC<CreationModalProps> = ({ handleModalClose, qrRequest, fetchQrRequests }) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { addToast } = useToasts();

  const handleCreationModalSubmit = async (values: CreationModalFormikValues) => {
    setIsSubmitting(true);
    const { requested_codes } = values;
    if (qrRequest) {
      await setQrRequests(qrRequest.id, requested_codes)
        .then((_) => {
          setIsSubmitting(false);
          addToast('QR Request approved correctly', {
            appearance: 'success',
            autoDismiss: true,
          });
          fetchQrRequests();
          handleModalClose();
        })
        .catch((e) => {
          console.log(e);
          addToast(e.message, {
            appearance: 'error',
            autoDismiss: false,
          });
        });
    }
    setIsSubmitting(false);
  };

  const handleCreationModalClosing = () => handleModalClose();

  return (
    <Formik
      initialValues={{
        requested_codes: qrRequest?.requested_codes ? qrRequest?.requested_codes : 0,
      }}
      validateOnBlur={false}
      validateOnChange={false}
      onSubmit={handleCreationModalSubmit}
    >
      {({ handleSubmit }) => {
        return (
          <div className={'update-modal-container authentication_modal_container'}>
            <div className={'modal-top-bar'}>
              <h3>QR Create</h3>
            </div>
            <div className="select-container">
              <div className="bk-form-row">
                <h4>Requested Codes</h4>
                <Field type="number" name={'requested_codes'} placeholder={'Requested Codes'} />
              </div>
            </div>
            <div className="modal-content">
              <div className="modal-buttons-container creation-modal">
                <SubmitButton
                  text="Cancel"
                  isSubmitting={false}
                  canSubmit={true}
                  onClick={handleCreationModalClosing}
                />
                <SubmitButton text="Accept" isSubmitting={isSubmitting} canSubmit={true} onClick={handleSubmit} />
              </div>
            </div>
          </div>
        );
      }}
    </Formik>
  );
};

type EditButtonProps = {
  id: number;
  reviewed: boolean;
  onClick: (id: number) => void;
  style?: CSSProperties;
};

const EditButton: React.FC<EditButtonProps> = ({ id, reviewed, onClick, style }) => {
  return !reviewed ? (
    <img src={edit} alt={'Edit'} className={'icon'} onClick={() => onClick(id)} style={style} />
  ) : (
    <img src={editDisable} alt={'Edit'} className={'icon'} style={style} />
  );
};

type ReviewedIconProps = {
  reviewed: boolean;
};

const ReviewedIcon: React.FC<ReviewedIconProps> = ({ reviewed }) => {
  return <img src={reviewed ? checked : error} alt={reviewed ? `QR Reviewed` : 'QR not Reviewed'} className={'icon'} />;
};

interface QrRequestTableData {
  id: number;
  event: PoapEvent;
  organizer: string | undefined;
  created_date: string;
  amount: string;
  reviewed_by?: string;
  reviewed_date?: string;
  reviewed: boolean;
  website_request: boolean;
}

type QrRequestTableProps = {
  data: QrRequestTableData[];
  loading: boolean;
  onEdit: (id: number) => void;
  onSortChange: (rules: Array<SortingRule<QrRequestTableData>>) => void;
};

const QrRequestTable: React.FC<QrRequestTableProps> = ({ data, onEdit, onSortChange, loading }) => {
  const columns = React.useMemo<Column<QrRequestTableData>[]>(
    () => [
      {
        id: 'expander',
        accessor: 'reviewed',
        Cell: ({ row }) => (
          <span {...row.getToggleRowExpandedProps()}>
            <ExpandedIcon isExpanded={row.isExpanded} />
          </span>
        ),
        disableSortBy: true,
      },
      { Header: '#', accessor: 'id', disableSortBy: true },
      {
        id: 'event',
        Header: () => <div className={'left'}>Event</div>,
        Cell: (props: PropsWithChildren<TableInstance<QrRequestTableData>>) => (
          <Link to={`/admin/events/${props.row.original.event.fancy_id}`} target="_blank" rel="noopener noreferrer">
            #{props.row.original.event.id} - {props.row.original.event.name}
          </Link>
        ),
        disableSortBy: true,
      },
      {
        id: 'organizer',
        Header: () => <div className={'left'}>Organizer</div>,
        accessor: 'organizer',
        disableSortBy: true,
        Cell: ({ value }) => <div className="expand-on-hover-md">{value}</div>,
      },
      {
        id: 'created_date',
        Header: 'Created Date',
        accessor: 'created_date',
        Cell: ({ value }) => <div className={'center'}>{value}</div>,
      },
      {
        Header: 'Amount',
        accessor: 'amount',
        Cell: ({ value }) => <div className={'center'}>{value}</div>,
        disableSortBy: true,
      },
      {
        id: 'reviewed_date',
        Header: 'Reviewed Date',
        accessor: 'reviewed_date',
        Cell: ({ value }) => <div className={'center'}>{value}</div>,
      },
      {
        Header: 'Reviewed',
        accessor: 'reviewed',
        Cell: ({ value }) => (
          <div className={'center'}>
            <ReviewedIcon reviewed={value} />
          </div>
        ),
        disableSortBy: true,
      },
      {
        Header: 'Type',
        accessor: 'website_request',
        Cell: ({ value }) => <div className={'center'}>{value ? 'website' : 'qr'}</div>,
        disableSortBy: true,
      },
      {
        id: 'edit',
        accessor: 'reviewed',
        Cell: (props) => (
          <EditButton id={props.row.original.id} reviewed={props.row.original.reviewed} onClick={onEdit} />
        ),
        disableSortBy: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    visibleColumns,
    state: { sortBy },
  } = useTable<QrRequestTableData>(
    {
      data,
      columns,
      manualSortBy: true,
    },
    useSortBy,
    useExpanded,
  );

  useEffect(() => {
    onSortChange(sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  return (
    <table className={'backoffice-table fluid'} {...getTableProps()}>
      <thead>
        {headerGroups.map((headerGroup, i) => (
          <tr key={i} {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column, j) => (
              <th key={j} {...column.getHeaderProps([column.getSortByToggleProps()])}>
                {column.render('Header')}
                {column.isSorted ? <SortIcon isSortedDesc={column.isSortedDesc} /> : null}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {!loading &&
          rows.map((row, i) => {
            prepareRow(row);
            return (
              <React.Fragment key={i + 'fragment'}>
                <tr key={i + 'row'} {...row.getRowProps()}>
                  {row.cells.map((cell, j) => {
                    return (
                      <td key={j} {...cell.getCellProps()}>
                        {cell.render('Cell')}
                      </td>
                    );
                  })}
                </tr>
                {row.isExpanded ? (
                  <tr key={i + 'expanded'}>
                    <td className={'subcomponent'} key={i + 'subcomponent'} colSpan={visibleColumns.length}>
                      <EventSubComponent event={row.original.event} reviewed_by={row.original.reviewed_by} />
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        {loading && (
          <tr>
            <td className={'loading'} colSpan={10}>
              <Loading />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

type EventSubComponentProps = {
  event: PoapEvent;
  reviewed_by: string | undefined;
};

const EventSubComponent: React.FC<EventSubComponentProps> = ({ event, reviewed_by }) => {
  const dateFormatter = (dateString: string) => format(new Date(dateString), 'dd-MMM-yyyy');

  return (
    <div style={{ textAlign: 'center' }} className={'subcomponent-content'}>
      <h4 style={{ fontWeight: 500 }}>
        from {dateFormatter(event.start_date)} to {dateFormatter(event.end_date)} expires{' '}
        {dateFormatter(event.expiry_date)}
      </h4>
      <img src={event.image_url} style={{ maxWidth: '100px', paddingBottom: '5px' }} alt={'event'} />
      <div style={{ textAlign: 'center', overflowWrap: 'break-word', whiteSpace: 'normal' }}>{event.description}</div>
      <div style={{ textAlign: 'center' }}>Reviewed by: {reviewed_by}</div>
    </div>
  );
};

const QrRequestTableMobile: React.FC<QrRequestTableProps> = ({ data, onEdit, loading }) => {
  const dateFormatter = (dateString: string) => format(new Date(dateString), 'dd-MMM-yyyy');

  return loading ? (
    <Loading />
  ) : (
    <table className={'backoffice-table fluid'}>
      <tbody>
        {data.map((request, i) => (
          <tr key={i}>
            <td className={'wrap'}>
              <div>
                <span>#{request.id}</span>
                <EditButton id={request.id} reviewed={request.reviewed} onClick={onEdit} style={{ float: 'right' }} />
              </div>
              <div>
                <b>Event: </b>
                <Link to={`/admin/events/${request.event.fancy_id}`} target="_blank" rel="noopener noreferrer">
                  #{request.event.id} - {request.event.name}
                </Link>
              </div>
              <div>
                <b>Organizer: </b> {request.event.email}
              </div>
              <div>
                <b>Event description: </b> {request.event.description}
              </div>
              <div>
                <b>Event from: </b> {dateFormatter(request.event.start_date)}
              </div>
              <div>
                <b>Event to:</b> {dateFormatter(request.event.end_date)}
              </div>
              <div>
                <b>Event expires: </b> {dateFormatter(request.event.expiry_date)}
              </div>
              <div>
                <b>Amount:</b> {request.amount}
              </div>
              <div>
                <b>Created Date: </b> {request.created_date}
              </div>
              <div>
                <b>Reviewed: </b> <ReviewedIcon reviewed={request.reviewed} />
              </div>
              {request.reviewed ? (
                <>
                  <div>
                    <b>Reviewed by: </b> {request.reviewed_by}
                  </div>
                  <div>
                    <b>Reviewed date: </b> {request.reviewed_date}
                  </div>
                </>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
export { QrRequests };
