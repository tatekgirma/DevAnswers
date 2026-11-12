import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  upvoteQuestion,
  downvoteQuestion,
  createAnswerForQuestion,
} from "../services/questionService.js";
import { upvoteAnswer, downvoteAnswer } from "../services/answerService.js";

const initialState = {
  questions: [],
  currentQuestion: null,
  loading: false,
  error: null,
};

export const fetchQuestions = createAsyncThunk(
  "question/fetchQuestions",
  async (_, { rejectWithValue }) => {
    try {
      return await getAllQuestions();
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch questions",
      );
    }
  },
);

export const fetchQuestionById = createAsyncThunk(
  "question/fetchQuestionById",
  async (id, { rejectWithValue }) => {
    try {
      return await getQuestionById(id);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch question",
      );
    }
  },
);

export const postQuestion = createAsyncThunk(
  "question/postQuestion",
  async ({ title, description, tags }, { getState, rejectWithValue }) => {
    try {
      const { userId, token } = getState().user.userInfo;
      return await createQuestion(
        { title, description, tags, author: userId },
        token,
      );
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to post question",
      );
    }
  },
);

export const voteQuestion = createAsyncThunk(
  "question/voteQuestion",
  async ({ question, voteType }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user.userInfo;

      if (voteType === "upvote") {
        return await upvoteQuestion(question._id, token);
      }

      if (voteType === "downvote") {
        return await downvoteQuestion(question._id, token);
      }

      throw new Error("Invalid question vote type");
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to vote on question",
      );
    }
  },
);

export const voteAnswer = createAsyncThunk(
  "question/voteAnswer",
  async ({ answer, voteType }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().user.userInfo;

      if (voteType === "upvote") {
        return await upvoteAnswer(answer._id, token);
      }

      if (voteType === "downvote") {
        return await downvoteAnswer(answer._id, token);
      }

      throw new Error("Invalid answer vote type");
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to vote on answer",
      );
    }
  },
);

export const postAnswer = createAsyncThunk(
  "question/postAnswer",
  async ({ questionId, answerText }, { getState, rejectWithValue }) => {
    try {
      const { userId, token } = getState().user.userInfo;

      if (!userId || !token) {
        throw new Error("Authenticated user information is unavailable");
      }

      return await createAnswerForQuestion(questionId, answerText, token);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to post answer",
      );
    }
  },
);

const questionSlice = createSlice({
  name: "question",
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestions.fulfilled, (state, action) => {
        state.loading = false;
        state.questions = action.payload;
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchQuestionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestionById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuestion = action.payload;
      })
      .addCase(fetchQuestionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(postQuestion.pending, (state) => {
        state.loading = true;
      })
      .addCase(postQuestion.fulfilled, (state, action) => {
        state.loading = false;
        state.questions.push(action.payload);
        state.currentQuestion = action.payload;
      })
      .addCase(postQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(voteQuestion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(voteQuestion.fulfilled, (state, action) => {
        state.loading = false;
        const questionId = action.meta.arg.question._id;
        const { upvotes, downvotes, voteCount } = action.payload;
        const question = state.questions.find(
          (item) => item._id === questionId,
        );

        if (question) {
          question.upvotes = upvotes;
          question.downvotes = downvotes;
          question.voteCount = voteCount;
        }

        if (state.currentQuestion?._id === questionId) {
          state.currentQuestion.upvotes = upvotes;
          state.currentQuestion.downvotes = downvotes;
          state.currentQuestion.voteCount = voteCount;
        }
      })
      .addCase(voteQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(voteAnswer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(voteAnswer.fulfilled, (state, action) => {
        state.loading = false;
        const answerIndex = state.currentQuestion?.answers?.findIndex(
          (answer) => answer._id === action.meta.arg.answer._id,
        );

        if (answerIndex !== undefined && answerIndex >= 0) {
          const answer = state.currentQuestion.answers[answerIndex];
          answer.upvotes = action.payload.upvotes;
          answer.downvotes = action.payload.downvotes;
          answer.voteCount = action.payload.voteCount;
        }
      })
      .addCase(voteAnswer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(postAnswer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(postAnswer.fulfilled, (state, action) => {
        state.loading = false;

        if (state.currentQuestion?._id === action.meta.arg.questionId) {
          state.currentQuestion.answers.push(action.payload);
        }
      })
      .addCase(postAnswer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default questionSlice.reducer;
