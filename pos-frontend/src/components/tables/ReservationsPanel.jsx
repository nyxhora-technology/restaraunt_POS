import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { MdCalendarMonth, MdDeleteOutline, MdLockOutline } from "react-icons/md";
import {
  createReservation,
  deleteReservation,
  getErrorMessage,
  getReservations,
} from "../../https";
import useFeature from "../../hooks/useFeature";
import { getTableLabel } from "./tableOptions";

const initialForm = {
  tableId: "",
  name: "",
  phone: "",
  partySize: 2,
  reservedAt: "",
  notes: "",
};

const ReservationsPanel = ({ tables }) => {
  const { hasReservations } = useFeature();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const { data, isLoading } = useQuery({
    queryKey: ["reservations"],
    queryFn: getReservations,
    enabled: hasReservations,
  });
  const reservations = data?.data?.data || [];
  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      enqueueSnackbar("Reservation added to the table schedule.", { variant: "success" });
    },
    onError: (error) => enqueueSnackbar(
      getErrorMessage(error, "Reservation could not be created"),
      { variant: "error" },
    ),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  if (!hasReservations) {
    return (
      <section className="reservations-locked">
        <div className="reservations-locked-calendar" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
        </div>
        <div>
          <span><MdLockOutline /></span>
          <p>Professional table planning</p>
          <h2>Protect peak-hour tables before guests arrive.</h2>
          <p>Schedule guests against exact tables, avoid walk-in conflicts, and give the service team one clear view of what is coming next.</p>
          <button type="button">Reservations are included with Professional</button>
        </div>
      </section>
    );
  }

  const submit = (event) => {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      partySize: Number(form.partySize),
      reservedAt: new Date(form.reservedAt).toISOString(),
    });
  };

  return (
    <section className="reservations-workspace">
      <form className="reservation-form" onSubmit={submit}>
        <div className="reservation-form-heading">
          <span><MdCalendarMonth /></span>
          <div><h2>New reservation</h2><p>Block the right table before service.</p></div>
        </div>
        <label>Guest name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Sharma family" /></label>
        <div className="reservation-form-row">
          <label>Phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 98765 43210" /></label>
          <label>Party size<input required type="number" min="1" max="100" value={form.partySize} onChange={(event) => setForm({ ...form, partySize: event.target.value })} /></label>
        </div>
        <label>Table<select required value={form.tableId} onChange={(event) => setForm({ ...form, tableId: event.target.value })}><option value="">Choose a table</option>{tables.filter((table) => table.isActive !== false).map((table) => <option key={table.id} value={table.id}>{getTableLabel(table)} · {table.seats} seats</option>)}</select></label>
        <label>Date and time<input required type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={form.reservedAt} onChange={(event) => setForm({ ...form, reservedAt: event.target.value })} /></label>
        <label>Service note<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="High chair, anniversary, accessibility…" /></label>
        <button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Reserving…" : "Reserve table"}</button>
      </form>

      <div className="reservation-agenda">
        <header><div><p>Upcoming</p><h2>Reservation agenda</h2></div><strong>{reservations.length}</strong></header>
        {isLoading ? <p className="reservation-empty">Loading schedule…</p> : reservations.length ? (
          <div className="reservation-list">
            {reservations.map((reservation) => (
              <article key={reservation.id}>
                <time><strong>{new Date(reservation.reservedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong><span>{new Date(reservation.reservedAt).toLocaleDateString([], { day: "numeric", month: "short" })}</span></time>
                <div><strong>{reservation.name}</strong><span>{getTableLabel(reservation.table)} · {reservation.partySize} guests</span><small>{reservation.phone}{reservation.notes ? ` · ${reservation.notes}` : ""}</small></div>
                <button type="button" aria-label={`Cancel reservation for ${reservation.name}`} onClick={() => deleteMutation.mutate(reservation.id)}><MdDeleteOutline /></button>
              </article>
            ))}
          </div>
        ) : <div className="reservation-empty"><MdCalendarMonth /><strong>No upcoming reservations</strong><span>Your next booking will appear here.</span></div>}
      </div>
    </section>
  );
};

export default ReservationsPanel;
