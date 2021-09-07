import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { OptionTypeBase } from 'react-select';
import { useToasts } from 'react-toast-notifications';

/* Helpers */
import { PoapEvent, Delivery, getEvents, getDeliveries } from '../../api';
import { ROUTES } from '../../lib/constants';

/* Components */
import { Loading } from '../../components/Loading';
import FilterButton from '../../components/FilterButton';
import ReactPaginate from 'react-paginate';

/* Assets */
import { ReactComponent as EditIcon } from '../../images/edit.svg';
import checked from '../../images/checked.svg';
import error from '../../images/error.svg';
import EventSelect, { colourStyles } from 'components/EventSelect';

/* Types */
type PaginateAction = {
  selected: number;
};

const DeliveriesList = () => {
  /* State */
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);
  const [selectedEvent, setSelectedEvent] = useState<number | undefined>(undefined);
  const [events, setEvents] = useState<PoapEvent[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isFetching, setIsFetching] = useState<null | boolean>(null);

  const { addToast } = useToasts();

  /* Effects */
  useEffect(() => {
    fetchEvents();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */
  useEffect(() => {
    if (deliveries.length > 0) fetchDeliveries();
  }, [page]); /* eslint-disable-line react-hooks/exhaustive-deps */
  useEffect(() => {
    setPage(0);
    fetchDeliveries();
  }, [selectedEvent, limit]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Data functions */
  const fetchDeliveries = async () => {
    setIsFetching(true);
    try {
      const response = await getDeliveries(limit, page * limit, selectedEvent, null, null);
      if (response) {
        setDeliveries(response.deliveries);
        setTotal(response.total);
      }
    } catch (e) {
      addToast('Error while fetching deliveries. '+e, {
        appearance: 'error',
        autoDismiss: false,
      });
    } finally {
      setIsFetching(false);
    }
  };
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

  /* UI Handlers */
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    setLimit(parseInt(value, 10));
  };
  const handleSelectChange = (option?: OptionTypeBase | null): void => {
    setSelectedEvent(option ? option.value : option);
  };
  const handlePageChange = (obj: PaginateAction) => setPage(obj.selected);

  /* UI Manipulation */
  const toLabel = (event: PoapEvent) => {
    const label = `#${event.id} - ${event.name ? event.name : 'No name'} (${event.fancy_id}) - ${event.year}`;
    return {
      value: event.id,
      label: label,
      start_date: event.start_date
    };
  };

  const tableHeaders = (
    <div className={'row table-header visible-md'}>
      <div className={'col-md-3'}>Name</div>
      <div className={'col-md-5'}>Event/s</div>
      <div className={'col-md-2'}>URL</div>
      <div className={'col-md-1 center'}>Active</div>
      <div className={'col-md-1'} />
    </div>
  );

  return (
    <div className={'admin-table deliveries'}>
      <h2>Deliveries</h2>
      <div className="filters-container deliveries">
        <div className={'filter col-md-4 col-xs-12'}>
          <div className="filter-option">
            <EventSelect
              name="event"
              styles={colourStyles}
              onChange={handleSelectChange}
              toEventOption={toLabel}
              placeholder={'Filter by Event'} />
          </div>
        </div>
        <div className={'col-md-5'} />
        <div className={'filter col-md-3 col-xs-6 new-button'}>
          <Link to={ROUTES.deliveries.newForm.path}>
            <FilterButton text="Create new" />
          </Link>
        </div>
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
      {isFetching && (
        <div className={'delivery-table-section'}>
          {tableHeaders}
          <Loading />
        </div>
      )}

      {deliveries && deliveries.length === 0 && !isFetching && <div className={'no-results'}>No Deliveries found</div>}

      {deliveries && deliveries.length !== 0 && !isFetching && (
        <div className={'delivery-table-section'}>
          {tableHeaders}
          <div className={'admin-table-row delivery-table'}>
            {deliveries.map((delivery, i) => {
              return (
                <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={delivery.id} style={{position: 'relative'}}>
                  <div className={'col-md-3 col-xs-12 ellipsis'}>
                    <span className={'visible-sm'}>Name: </span>
                    {delivery.card_title}
                  </div>

                  <div className={'col-md-5 col-xs-12 ellipsis'}>
                    <span className={'visible-sm'}>Event/s: </span>
                    {delivery.event_ids.split(',').map((id, i) => {
                      if (events) {
                        try {
                          let _id = parseInt(id, 10);
                          let event = events.find((e) => e.id === _id);
                          if (event) return event.name.substr(0, 20) + ` (${_id})${i !== delivery.event_ids.split(',').length-1 ? '; ' : ''}`;
                        } catch (e) {
                          console.log(e);
                        }
                      }
                      return id;
                    })}
                  </div>

                  <div className={'col-md-2 col-xs-12'}>
                    <span className={'visible-sm'}>URL: </span>
                    <a href={`https://poap.delivery/${delivery.slug}`} target={'_blank'} rel="noopener noreferrer">
                      {delivery.slug}
                    </a>
                  </div>

                  <div className={'col-md-1 col-xs-1 center status active-icon'}>
                    <span className={'visible-sm'}>Active: </span>
                    <img
                      src={delivery.active ? checked : error}
                      alt={delivery.active ? 'Active' : 'Inactive'}
                      style={{marginLeft: 10}}
                      className={'status-icon'}
                    />
                  </div>
                  <div className={'col-md-1 col-xs-1 center event-edit-icon-container'}>
                    <Link to={`/admin/deliveries/${delivery.id}`}>
                      <EditIcon />
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
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
        </div>
      )}
    </div>
  );
};

export default DeliveriesList;
