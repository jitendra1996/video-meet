import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./slices/authSlice";
import { classroomSlice } from "./slices/classroomSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    classroom: classroomSlice.reducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: [],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
