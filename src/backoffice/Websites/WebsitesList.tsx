import React, { FC, useEffect, useState } from 'react';
import { useToasts } from 'react-toast-notifications';

/* Helpers */
import { getEventById, getWebsiteByName, getWebsites, PoapEvent, Website } from '../../api';

/* Components */
import { Loading } from '../../components/Loading';
import FilterButton from '../../components/FilterButton';
import FilterSelect from '../../components/FilterSelect';
import ReactPaginate from 'react-paginate';
import ReactModal from 'react-modal';

/* Assets */
import { ReactComponent as EditIcon } from '../../images/edit.svg';
import checked from '../../images/checked.svg';
import error from '../../images/error.svg';
import { format, parse } from 'date-fns';
import { EventSecretCodeForm } from './EventSecretCodeForm';

/* Types */
type PaginateAction = {
  selected: number;
};

type WebsitesListProps = {
  onCreateNew: (event: PoapEvent) => void;
  onEdit: (event: PoapEvent) => void;
};

const WebsitesList: FC<WebsitesListProps> = ({ onCreateNew, onEdit }) => {
  /* State */
  const [page, setPage] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);
  const [activeStatus, setActiveStatus] = useState<boolean | null>(null);
  const [timeframe, setTimeframe] = useState<string | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isFetching, setIsFetching] = useState<null | boolean>(null);
  const [isEventIdModalOpen, setIsEventIdModalOpen] = useState<boolean>(false);
  const [isFetchingEvent, setIsFetchingEvent] = useState<boolean>(false);
  const [eventIdModalError, setEventIdModalError] = useState<string | undefined>(undefined);

  const { addToast } = useToasts();

  /* Effects */

  useEffect(() => {
    if (websites.length > 0) fetchWebsites().then();
  }, [page]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    setPage(0);
    fetchWebsites().then();
  }, [activeStatus, timeframe, limit]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Data functions */
  const fetchWebsites = async () => {
    setIsFetching(true);
    try {
      const response = await getWebsites(limit, page * limit, activeStatus, timeframe);
      if (response) {
        setWebsites(response.websites);
        setTotal(response.total);
      }
    } catch (e) {
      addToast('Error while fetching websites', {
        appearance: 'error',
        autoDismiss: false,
      });
    } finally {
      setIsFetching(false);
    }
  };

  /* UI Handlers */
  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    setLimit(parseInt(value, 10));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    let finalValue = value === '' ? null : value === 'true';
    setActiveStatus(finalValue);
  };

  const handleTimeframe = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { value } = e.target;
    let finalValue = value === '' ? null : value;
    setTimeframe(finalValue);
  };

  const handlePageChange = (obj: PaginateAction) => setPage(obj.selected);

  const handleEventIdModalSubmit = async (eventId: number): Promise<void> => {
    setIsFetchingEvent(true);
    setEventIdModalError(undefined);

    try {
      const event = await getEventById(eventId);

      if (event) {
        if (event.expiry_date) {
          const expirationDate = parse(event.expiry_date, 'dd-MMM-yyyy', new Date());
          if (new Date().getTime() > expirationDate.getTime()) {
            setIsFetchingEvent(false);
            setEventIdModalError('the event is expired');
            return;
          }
        }

        onCreateNew(event);
      } else {
        setIsFetchingEvent(false);
        setEventIdModalError('invalid event or secret code');
      }
    } catch (e) {
      setIsFetchingEvent(false);
      setEventIdModalError('invalid event or secret code');
    }
  };

  const handleEditOnClick = async (claimName: string): Promise<void> => {
    setIsFetching(true);
    const website = await getWebsiteByName(claimName);
    if (website.event_id) {
      const event = await getEventById(website.event_id);
      setIsFetching(false);
      if (event) {
        onEdit(event);
      }
    } else {
      setIsFetching(false);
    }
  };

  const tableHeaders = (
    <div className={'row table-header visible-md'}>
      <div className={'col-md-4 col-xs-3 '}>ClaimName</div>
      <div className={'col-md-2 col-xs-2 '}>Start Date</div>
      <div className={'col-md-2 col-xs-2 '}>End Date</div>
      <div className={'col-md-1 col-xs-2 '}>Claim/Total</div>
      <div className={'col-md-1 col-xs-1 visible-md center'}>Captcha</div>
      <div className={'col-md-1 col-xs-1 center'}>Active</div>
      <div className={'col-md-1 col-xs-1'} />
    </div>
  );

  return (
    <div className={'admin-table websites'}>
      {/*Modals*/}
      <ReactModal
        isOpen={isEventIdModalOpen}
        onRequestClose={() => {
          setIsEventIdModalOpen(false);
        }}
        shouldFocusAfterRender={true}
        shouldCloseOnEsc={true}
        shouldCloseOnOverlayClick={true}
        style={{ content: { overflow: 'visible' } }}
      >
        <EventSecretCodeForm
          onSubmit={handleEventIdModalSubmit}
          error={eventIdModalError}
          loading={isFetchingEvent}
          onClose={() => {
            setIsEventIdModalOpen(false);
          }}
        />
      </ReactModal>
      {/*End Modals*/}
      <h2>Websites</h2>
      <div className="filters-container websites">
        <div className={'filter col-md-4 col-xs-12'}>
          <div className={'filter-group'}>
            <FilterSelect handleChange={handleTimeframe}>
              <option value="">Filter by Time Frame</option>
              <option value="future">Future Events</option>
              <option value="present">Present Events</option>
              <option value="past">Past Events</option>
            </FilterSelect>
          </div>
        </div>
        <div className={'filter col-md-3 col-xs-6'}>
          <div className={'filter-group'}>
            <FilterSelect handleChange={handleStatusChange}>
              <option value="">Filter by status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </FilterSelect>
          </div>
        </div>
        <div className={'col-md-2'} />
        <div className={'filter col-md-3 col-xs-6 new-button'}>
          <FilterButton
            text="Create new"
            handleClick={() => {
              setIsEventIdModalOpen(true);
            }}
          />
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

      {websites && websites.length === 0 && !isFetching && <div className={'no-results'}>No Websites found</div>}

      {websites && websites.length !== 0 && !isFetching && (
        <div className={'website-table-section'}>
          {tableHeaders}
          <div className={'admin-table-row website-table'}>
            {websites.map((website, i) => {
              return (
                <div className={`row ${i % 2 === 0 ? 'even' : 'odd'}`} key={i}>
                  <div className={'col-md-4 col-xs-12 ellipsis'}>
                    <span className={'visible-sm'}>Claim Name: </span>
                    {website.claim_name}
                  </div>

                  <div className={'col-md-2 col-xs-12 ellipsis'}>
                    <span className={'visible-sm'}>Start Date: </span>
                    {website.from ? format(new Date(website.from), 'MM-dd-yyyy HH:MM') : '-'}
                  </div>

                  <div className={'col-md-2 col-xs-12 ellipsis'}>
                    <span className={'visible-sm'}>End Date: </span>
                    {website.to ? format(new Date(website.to), 'MM-dd-yyyy HH:MM') : '-'}
                  </div>

                  <div className={'col-md-1 col-xs-12 ellipsis center'}>
                    <span className={'visible-sm'}>Claimed / Total: </span>
                    {website.deliveriesCount?.claimed + '/' + website.deliveriesCount?.total}
                  </div>

                  <div className={'col-md-1 visible-md center status'}>
                    <span className={'visible-sm'}>Captcha: </span>
                    <img
                      src={website.captcha ? checked : error}
                      alt={website.captcha ? 'Active' : 'Inactive'}
                      className={'status-icon'}
                    />
                  </div>

                  <div className={'col-md-1 col-xs-12 center status'}>
                    <span className={'visible-sm'}>Active: </span>
                    <img
                      src={website.active ? checked : error}
                      alt={website.active ? 'Active' : 'Inactive'}
                      className={'status-icon status-icon-websites'}
                    />
                  </div>

                  <div className={'col-md-1 col-xs-1 center event-edit-icon-container'}>
                    <EditIcon
                      onClick={async () => {
                        await handleEditOnClick(website.claim_name);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
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

export default WebsitesList;
