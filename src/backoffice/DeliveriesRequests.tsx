import React, { CSSProperties, FC, useEffect, useState } from 'react';

/* Libraries */
import ReactPaginate from 'react-paginate';
import ReactModal from 'react-modal';
import { Formik } from 'formik';
import { useToasts } from 'react-toast-notifications';

/* Components */
import { Loading } from '../components/Loading';
import FilterSelect from '../components/FilterSelect';
import { SubmitButton } from '../components/SubmitButton';
import { Column, SortingRule, useExpanded, useSortBy, useTable } from 'react-table';

/* Helpers */
import {
  Delivery,
  getDeliveries, getEventById,
  PoapEvent, PoapFullEvent, rebuildDeliveries,
  SortCondition,
  SortDirection, updateDeliveryStatus,
} from '../api';
import { format } from 'date-fns';
import { timeSince } from '../lib/helpers';
import { useWindowWidth } from '@react-hook/window-size/throttled';

/* Assets */
import edit from 'images/edit.svg';
import editDisable from 'images/edit-disable.svg';
import checked from '../images/checked.svg';
import error from '../images/error.svg';
import pending from '../images/pending.svg';
import { Tooltip } from 'react-lightweight-tooltip';
import { ExpandedIcon, SortIcon } from './RequestsComponents';

type PaginateAction = {
  selected: number;
};

// creation modal types
type CreationModalProps = {
  handleModalClose: () => void;
  fetchDeliveries: () => void;
  rebuildDeliveriesPage: () => void;
  deliveryId?: number;
};

type CreationModalFormikValues = {
  approved: string
};

const DeliveriesRequests: FC = () => {
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [isFetchingDeliveries, setIsFetchingDeliveries] = useState<boolean>(false);
  const [approvedFilter, setApprovedFilter] = useState<string>('');
  const [isCreationModalOpen, setIsCreationModalOpen] = useState<boolean>(false);
  const [_deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<undefined | number>(undefined);
  const [sortCondition, setSortCondition] = useState<undefined | SortCondition>(undefined);
  const [isRebuilding, setIsRebuilding] = useState<boolean>(false);
  const width = useWindowWidth();

  useEffect(() => {
    fetchDeliveries().then();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    fetchDeliveries().then();
  }, [page]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    setPage(0);
    fetchDeliveries().then();
  }, [approvedFilter, limit, sortCondition]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (isRebuilding) {
      addToast(`Rebuilding poap.delivery...`, {
        appearance: 'info',
        autoDismiss: true,
      });
    }
  }, [isRebuilding]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const fetchDeliveries = async () => {
    setIsFetchingDeliveries(true);

    let event_id = undefined;
    let approved = undefined;
    if (approvedFilter) approved = approvedFilter === 'approved' ? true : approvedFilter === 'rejected' ? false : null;

    const response = await getDeliveries(limit, page * limit, event_id, approved, null, null);
    const { deliveries, total } = response;

    setTotal(total);
    setDeliveries(deliveries);
    setIsFetchingDeliveries(false);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    setApprovedFilter(value);
  };

  const handlePageChange = (obj: PaginateAction) => {
    setPage(obj.selected);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    setLimit(parseInt(value, 10));
  };

  const handleCreationModalClick = (id: number): void => {
    setSelectedDeliveryId(id);
    setIsCreationModalOpen(true);
  };

  const handleCreationModalRequestClose = (): void => {
    setSelectedDeliveryId(undefined);
    setIsCreationModalOpen(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${timeSince(date)} ago`;
  };

  const handleOnSortChanged = (sortRules: SortingRule<DeliveryTableData>[]) => {
    if (!sortRules || sortRules.length < 1) return;
    const sortRule = sortRules[0];
    const sort_direction = sortRule.desc ? SortDirection.descending : SortDirection.ascending;
    const sortCondition: SortCondition = { sort_by: sortRule.id, sort_direction };
    setSortCondition(sortCondition);
  };

  const { addToast } = useToasts();
  const rebuildDeliveriesPage = async () => {
    setIsRebuilding(true)

    await rebuildDeliveries().then((_) => {
      addToast(`poap.delivery rebuilt succesfully`, {
        appearance: 'success',
        autoDismiss: true,
      });
    }).catch((e) => {
      console.log(e);
      addToast('poap.delivery failed to rebuild. \n' + e.message, {
        appearance: 'error',
        autoDismiss: false,
      });
    });

    setIsRebuilding(false)
  }

  const getTableData = (): DeliveryTableData[] => {
    return _deliveries.map((delivery) => {
      return {
        id: delivery.id,
        card_title: delivery.card_title,
        event_ids: delivery.event_ids.split(',').map((e) => parseInt(e, 10)),
        reviewed_date: delivery.approved && delivery.reviewed_date ? formatDate(new Date(delivery.reviewed_date).toDateString()) : '-',
        reviewed_by: delivery.approved ? delivery.reviewed_by : '-',
        approved: delivery.approved !== undefined ? delivery.approved : null,
      };
    });
  };

  return (
    <div className={'admin-table qr'}>
      <div style={{display: 'flex'}}>
        <h2>Manage Deliveries Requests</h2>
        <SubmitButton className='small' style={{margin: '0 0 2rem auto', minWidth: 100}} canSubmit={!isRebuilding} isSubmitting={isRebuilding} text={'Rebuild'} onClick={() => {
          rebuildDeliveriesPage()
        }} />
      </div>
      <div className={'filters-container qr'}>
        <div className={'filter col-md-3 col-xs-6'}>
          <div className={'filter-group'}>
            <FilterSelect handleChange={handleStatusChange}>
              <option value="">Filter by Approval</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </FilterSelect>
          </div>
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
            deliveryId={selectedDeliveryId}
            handleModalClose={handleCreationModalRequestClose}
            fetchDeliveries={fetchDeliveries}
            rebuildDeliveriesPage={rebuildDeliveriesPage}
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
        <DeliveryTable
          data={getTableData()}
          loading={isFetchingDeliveries}
          onEdit={handleCreationModalClick}
          onSortChange={handleOnSortChanged}
        />
      ) : (
        <DeliveryTableMobile
          data={getTableData()}
          loading={isFetchingDeliveries}
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

      {_deliveries && _deliveries.length === 0 && !isFetchingDeliveries && (
        <div className={'no-results'}>No Deliveries found</div>
      )}
    </div>
  );
};

const CreationModal: React.FC<CreationModalProps> = ({ handleModalClose, deliveryId, fetchDeliveries, rebuildDeliveriesPage }) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { addToast } = useToasts();

  const handleCreationModalSubmit = async (values: CreationModalFormikValues) => {
    setIsSubmitting(true);
    const { approved } = values;
    if (deliveryId && (approved === 'approved' || approved === 'rejected')) {
      await updateDeliveryStatus(deliveryId, approved === 'approved')
        .then((_) => {
          setIsSubmitting(false);
          addToast(`Delivery ${approved === null ? 'set as pending' : approved === 'approved' ? 'approved' : 'rejected'} correctly`, {
            appearance: 'success',
            autoDismiss: true,
          });
          fetchDeliveries();
          handleModalClose();
          rebuildDeliveriesPage();
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
        approved: ''
      }}
      validateOnBlur={false}
      validateOnChange={false}
      onSubmit={handleCreationModalSubmit}
    >
      {({ handleSubmit, setFieldValue }) => {
        return (
          <div className={'update-modal-container authentication_modal_container'}>
            <div className={'modal-top-bar'}>
              <h3>Delivery Create</h3>
            </div>
            <div className="select-container">
              <div className="bk-form-row">
                <h4>Approve</h4>
                <div className={'filter-group'}>
                  <FilterSelect handleChange={(e) => setFieldValue('approved', e.target.value)}>
                    <option value="">Set status</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </FilterSelect>
                </div>
              </div>
            </div>
            <div className="modal-content">
              <div className="modal-buttons-container creation-modal">
                <SubmitButton
                  text="Cancel"
                  isSubmitting={false}
                  canSubmit={true}
                  onClick={handleCreationModalClosing} />
                <SubmitButton
                  text="Accept"
                  isSubmitting={isSubmitting}
                  canSubmit={true}
                  onClick={handleSubmit} />
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
  approved: boolean|null;
  onClick: (id: number) => void;
  style?: CSSProperties;
};

const EditButton: React.FC<EditButtonProps> = ({ id, approved, onClick, style }) => {
  return !approved ? (
    <img src={edit} alt={'Edit'} className={'icon'} onClick={() => onClick(id)} style={style} />
  ) : (
    <img src={editDisable} alt={'Edit'} className={'icon'} style={style} />
  );
};

type ApprovedIconProps = {
  approved: boolean|null;
};

const ApprovedIcon: React.FC<ApprovedIconProps> = ({ approved }) => {
  return <Tooltip styles={{content: {position: 'absolute', top: 20, marginLeft: -35}, tooltip: {}, arrow: {display: 'none'}, wrapper: {}, gap: {}}} content={approved === null || approved === undefined ? 'Pending' : approved ? 'Approved' : 'Rejected'}><img src={approved === null || approved === undefined ? pending : approved ? checked : error} alt={approved === null || approved === undefined ? 'Delivery Pending' : approved ? `Delivery Reviewed` : 'Delivery not Reviewed'} className={'icon'} style={{cursor: 'default'}} /></Tooltip>;
};

const ApprovedIconMobile: React.FC<ApprovedIconProps> = ({ approved }) => {
  return <Tooltip styles={{content: {position: 'absolute', top: 20, right: 0}, tooltip: {}, arrow: {display: 'none'}, wrapper: {}, gap: {}}} content={approved === null || approved === undefined ? 'Pending' : approved ? 'Approved' : 'Rejected'}><img src={approved === null || approved === undefined ? pending : approved ? checked : error} alt={approved === null || approved === undefined ? 'Delivery Pending' : approved ? `Delivery Reviewed` : 'Delivery not Reviewed'} className={'icon'} style={{cursor: 'default'}} /></Tooltip>;
};

interface DeliveryTableData {
  id: number;
  card_title: string;
  event_ids: number[];
  reviewed_by?: string;
  reviewed_date?: string;
  approved: boolean|null;
}

type DeliveryTableProps = {
  data: DeliveryTableData[];
  loading: boolean;
  onEdit: (id: number) => void;
  onSortChange: (rules: Array<SortingRule<DeliveryTableData>>) => void;
};

const DeliveryTable: React.FC<DeliveryTableProps> = ({ data, onEdit, onSortChange, loading }) => {
  const columns = React.useMemo<Column<DeliveryTableData>[]>(
    () => [
      {
        id: 'expander',
        accessor: 'approved',
        Cell: ({ row }) => (
          <span {...row.getToggleRowExpandedProps()}>
            <ExpandedIcon isExpanded={row.isExpanded} />
          </span>
        ),
        disableSortBy: true,
      },
      { Header: '#', accessor: 'id', disableSortBy: true,
        Cell: ({ value }) => <div className={'center'}>{value}</div>,
      },
      {
        id: 'card_title',
        Header: 'Title',
        accessor: 'card_title',
        Cell: ({ value }) => <div className={'left'}>{value}</div>,
      },
      {
        id: 'reviewed_date',
        Header: 'Reviewed Date',
        accessor: 'reviewed_date',
        Cell: ({ value }) => <div className={'center'}>{value}</div>,
      },
      {
        Header: 'Status',
        accessor: 'approved',
        Cell: ({ value }) => (
          <div className={'center'}>
            <ApprovedIcon approved={value} />
          </div>
        ),
        disableSortBy: true,
      },
      {
        id: 'edit',
        accessor: 'approved',
        Cell: (props) => (
          <EditButton id={props.row.original.id} approved={props.row.original.approved} onClick={onEdit} />
        ),
        disableSortBy: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    visibleColumns,
    state: { sortBy },
  } = useTable<DeliveryTableData>(
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
                      {
                        row.original.event_ids.map((id, i) => (
                          <div key={i + 'subcomponentDiv' + id}>
                            <EventSubComponent key={i + 'subcomponent' + id} eventId={id}
                                                    reviewed_by={row.original.reviewed_by} />
                            {i !== row.original.event_ids.length-1 && <hr key={i + 'subcomponentHr' + id}/>}
                          </div>
                        ))
                      }
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        {loading && (
          <tr>
            <td colSpan={8}>
              <Loading />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

type EventSubComponentProps = {
  eventId: number;
  reviewed_by: string | undefined;
};

const EventSubComponent: React.FC<EventSubComponentProps> = ({ eventId, reviewed_by }) => {
  const dateFormatter = (dateString: string) => format(new Date(dateString), 'dd-MMM-yyyy');
  const [event, setEvent] = useState<PoapEvent|PoapFullEvent|null>(null)

  useEffect(() => {
    async function getEvent() {
      const event = await getEventById(eventId)
      if (event) setEvent(event)
    }
    getEvent().then()
  }, [eventId])

  return (
    event ?
    <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', flexDirection: 'column' }} className={'subcomponent'}>
      <h4 style={{ fontWeight: 500 }}>
        from {dateFormatter(event.start_date)} to {dateFormatter(event.end_date)} expires{' '}
        {dateFormatter(event.expiry_date)}
      </h4>
      <img src={event.image_url} style={{ maxWidth: '100px', paddingBottom: '5px' }} alt={'event'} />
      <div className={'ellipsis'} style={{ width: '70%' }}>{event.description}</div>
      <div style={{ textAlign: 'center' }}>Reviewed by: {reviewed_by}</div>
    </div> : null
  );
};

const DeliveryTableMobile: React.FC<DeliveryTableProps> = ({ data, onEdit, loading }) => {
  return loading ? (
    <Loading />
  ) : (
    <table className={'backoffice-table fluid'}>
      <tbody>
        {data.map((delivery, i) => (
          <tr key={i}>
            <td className={'wrap'}>
              <div>
                <span>#{delivery.id}</span>
                <EditButton id={delivery.id} approved={delivery.approved} onClick={onEdit} style={{ float: 'right' }} />
              </div>
              <div>
                <b>Card title:</b> {delivery.card_title}
              </div>
              <div>
                <b>Approved: </b> <ApprovedIconMobile approved={delivery.approved} />
              </div>
              {delivery.approved ? (
                <>
                  <div>
                    <b>Reviewed by: </b> {delivery.reviewed_by}
                  </div>
                  <div>
                    <b>Reviewed date: </b> {delivery.reviewed_date}
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
export { DeliveriesRequests };
