import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import questionReducer, {
  fetchQuestionById,
  fetchQuestions,
  postQuestion,
  voteQuestion,
} from "../../src/reducers/questionSlice.js";
import { mockQuestions, mockTags, mockUsers } from "../mocks/mockData.js";
import { server } from "../mocks/server.js";

const API_BASE = "http://localhost:3000/api";
const authenticatedUser = {
  userId: mockUsers.user1.userId,
  name: mockUsers.user1.name,
  token: mockUsers.user1.token,
};

// Avoids importing userSlice.js, which reads localStorage at module load.
const userReducer = (state = { userInfo: null }) => state;

function createTestStore(questionState = {}) {
  return configureStore({
    reducer: {
      user: userReducer,
      question: questionReducer,
    },
    preloadedState: {
      user: {
        userInfo: authenticatedUser,
        login: { status: "idle", error: null },
        registration: { status: "idle", error: null },
      },
      question: {
        questions: [],
        currentQuestion: null,
        loading: false,
        error: null,
        ...questionState,
      },
    },
  });
}

describe("question flow integration", () => {
  it("fetches all questions through the API and updates Redux state", async () => {
    const store = createTestStore();
    const request = store.dispatch(fetchQuestions());

    expect(store.getState().question.loading).toBe(true);

    const action = await request;
    expect(action.meta.requestStatus).toBe("fulfilled");
    expect(store.getState().question).toEqual({
      questions: mockQuestions,
      currentQuestion: null,
      loading: false,
      error: null,
    });
  });

  it("fetches a question by ID and sets it as the current question", async () => {
    const store = createTestStore();
    const request = store.dispatch(fetchQuestionById("question-1"));

    expect(store.getState().question.loading).toBe(true);

    const action = await request;
    expect(action.meta.requestStatus).toBe("fulfilled");
    expect(store.getState().question).toEqual({
      questions: [],
      currentQuestion: mockQuestions[0],
      loading: false,
      error: null,
    });
  });

  it("posts a question with the authenticated author and bearer token", async () => {
    const input = {
      title: "How do I test an async thunk?",
      description: "I need an example of a Redux Toolkit integration test.",
      tags: ["tag-2"],
    };
    const createdQuestion = {
      ...mockQuestions[1],
      _id: "question-created",
      ...input,
      tags: [mockTags[1]],
      author: {
        _id: authenticatedUser.userId,
        name: authenticatedUser.name,
      },
      answers: [],
      answerCount: 0,
      voteCount: 0,
    };
    let requestDetails;

    server.use(
      http.post(`${API_BASE}/questions`, async ({ request }) => {
        requestDetails = {
          method: request.method,
          authorization: request.headers.get("authorization"),
          body: await request.json(),
        };
        return HttpResponse.json({ data: createdQuestion }, { status: 201 });
      }),
    );

    const store = createTestStore();
    const request = store.dispatch(postQuestion(input));

    expect(store.getState().question.loading).toBe(true);

    const action = await request;
    expect(action.meta.requestStatus).toBe("fulfilled");
    expect(requestDetails).toEqual({
      method: "POST",
      authorization: `Bearer ${authenticatedUser.token}`,
      body: { ...input, author: authenticatedUser.userId },
    });
    expect(store.getState().question).toEqual({
      questions: [createdQuestion],
      currentQuestion: createdQuestion,
      loading: false,
      error: null,
    });
  });

  it("upvotes a question with the authenticated token and updates its vote state", async () => {
    const question = {
      ...mockQuestions[0],
      upvotes: [],
      downvotes: [],
      voteCount: 10,
    };
    const updatedVotes = {
      upvotes: [authenticatedUser.userId],
      downvotes: [],
      voteCount: 11,
    };
    let requestDetails;

    server.use(
      http.post(
        `${API_BASE}/questions/:id/upvote`,
        async ({ request, params }) => {
          requestDetails = {
            method: request.method,
            questionId: params.id,
            authorization: request.headers.get("authorization"),
            body: await request.json(),
          };
          return HttpResponse.json({ data: updatedVotes });
        },
      ),
    );

    const store = createTestStore({
      questions: [question],
      currentQuestion: question,
    });
    const request = store.dispatch(
      voteQuestion({ question, voteType: "upvote" }),
    );

    expect(store.getState().question.loading).toBe(true);

    const action = await request;
    expect(action.meta.requestStatus).toBe("fulfilled");
    expect(requestDetails).toEqual({
      method: "POST",
      questionId: question._id,
      authorization: `Bearer ${authenticatedUser.token}`,
      body: {},
    });

    const updatedQuestion = {
      ...question,
      ...updatedVotes,
    };
    expect(store.getState().question).toEqual({
      questions: [updatedQuestion],
      currentQuestion: updatedQuestion,
      loading: false,
      error: null,
    });
  });

  it("exposes API errors and clears loading after a failed fetch", async () => {
    server.use(
      http.get(`${API_BASE}/questions`, () =>
        HttpResponse.json(
          { message: "Question service unavailable" },
          { status: 503 },
        ),
      ),
    );

    const store = createTestStore({ questions: mockQuestions });
    const request = store.dispatch(fetchQuestions());

    expect(store.getState().question.loading).toBe(true);

    const action = await request;
    expect(action.meta.requestStatus).toBe("rejected");
    expect(store.getState().question).toEqual({
      questions: mockQuestions,
      currentQuestion: null,
      loading: false,
      error: "Question service unavailable",
    });
  });
});
