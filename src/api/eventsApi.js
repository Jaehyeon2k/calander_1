// src/api/eventsApi.js
import axios from "axios";

// json-server 주소 (4000)
const api = axios.create({
  baseURL: "http://localhost:4000",
});

export async function fetchEvents() {
  const res = await api.get("/events");
  return res.data;
}

export async function createEvent(event) {
  const res = await api.post("/events", event);
  return res.data;
}

export async function updateEvent(id, patch) {
  const res = await api.patch(`/events/${id}`, patch);
  return res.data;
}

export async function deleteEvent(id) {
  await api.delete(`/events/${id}`);
}

// 학교 일정(SCOPE = 'SCHOOL')만
export async function fetchSchoolEvents() {
  const res = await api.get("/events", {
    params: { scope: "SCHOOL" },
  });
  return res.data;
}

// ✅ 개인 일정(SCOPE='MY' + owner=uid)만
export async function fetchMyEvents(owner) {
  const res = await api.get("/events", {
    params: {
      scope: "MY",
      owner,
      _sort: "start",
      _order: "asc",
    },
  });
  return res.data;
}
