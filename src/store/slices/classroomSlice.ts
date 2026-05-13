import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type LiveClassSummary = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  hmsRoomId: string;
  recordingEnabled: boolean;
  teacherId: string;
  enrolledStudentIds: string[];
};

type ClassroomState = {
  classes: LiveClassSummary[];
  /** -1..5 from 100ms when available */
  networkQuality: number | null;
  unreadByClassId: Record<string, number>;
};

const initialState: ClassroomState = {
  classes: [],
  networkQuality: null,
  unreadByClassId: {},
};

export const classroomSlice = createSlice({
  name: "classroom",
  initialState,
  reducers: {
    setClasses(state, action: PayloadAction<LiveClassSummary[]>) {
      state.classes = action.payload;
    },
    setNetworkQuality(state, action: PayloadAction<number | null>) {
      state.networkQuality = action.payload;
    },
    bumpUnread(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.unreadByClassId[id] = (state.unreadByClassId[id] ?? 0) + 1;
    },
    clearUnread(state, action: PayloadAction<string>) {
      state.unreadByClassId[action.payload] = 0;
    },
  },
});

export const { setClasses, setNetworkQuality, bumpUnread, clearUnread } =
  classroomSlice.actions;
