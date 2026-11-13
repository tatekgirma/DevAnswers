import { describe, expect, it } from "vitest";
import {
  fetchQuestions,
  postQuestion,
} from "../../../src/reducers/questionSlice.js";
import questionReducer from "../../../src/reducers/questionSlice.js";
import { mockQuestions } from "../../mocks/mockData.js";

const initialState = {
  questions: [],
  currentQuestion: null,
  loading: false,
  error: null,
};

describe("question reducer", () => {
  it("returns the initial state", () => {
    expect(questionReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  describe("fetchQuestions", () => {
    it("sets loading and clears errors when pending", () => {
      const state = {
        ...initialState,
        questions: mockQuestions,
        currentQuestion: mockQuestions[0],
        error: "Previous error",
      };

      expect(
        questionReducer(state, fetchQuestions.pending("request-1")),
      ).toEqual({
        ...state,
        loading: true,
        error: null,
      });
    });

    it("stores fetched questions when fulfilled", () => {
      const state = questionReducer(
        {
          ...initialState,
          currentQuestion: mockQuestions[0],
          loading: true,
        },
        fetchQuestions.fulfilled(mockQuestions, "request-1"),
      );

      expect(state).toEqual({
        ...initialState,
        questions: mockQuestions,
        currentQuestion: mockQuestions[0],
      });
    });

    it("sets the error and stops loading when rejected", () => {
      const state = {
        ...initialState,
        questions: mockQuestions,
        currentQuestion: mockQuestions[0],
        loading: true,
      };

      expect(
        questionReducer(
          state,
          fetchQuestions.rejected(
            new Error("Request failed"),
            "request-1",
            undefined,
            "Unable to load questions",
          ),
        ),
      ).toEqual({
        ...state,
        loading: false,
        error: "Unable to load questions",
      });
    });
  });

  describe("postQuestion", () => {
    it("sets loading when pending", () => {
      const state = {
        ...initialState,
        questions: mockQuestions,
        currentQuestion: mockQuestions[0],
      };

      expect(
        questionReducer(
          state,
          postQuestion.pending("request-2", {
            title: "New question",
            description: "Question description",
            tags: [],
          }),
        ),
      ).toEqual({
        ...state,
        loading: true,
      });
    });

    it("adds the created question and makes it current when fulfilled", () => {
      const createdQuestion = {
        ...mockQuestions[1],
        _id: "question-created",
        title: "How do I test a reducer?",
      };

      expect(
        questionReducer(
          { ...initialState, questions: mockQuestions, loading: true },
          postQuestion.fulfilled(createdQuestion, "request-2", {
            title: createdQuestion.title,
            description: createdQuestion.description,
            tags: [],
          }),
        ),
      ).toEqual({
        ...initialState,
        questions: [...mockQuestions, createdQuestion],
        currentQuestion: createdQuestion,
      });
    });

    it("sets the error and preserves questions when rejected", () => {
      const state = {
        ...initialState,
        questions: mockQuestions,
        currentQuestion: mockQuestions[0],
        loading: true,
      };

      expect(
        questionReducer(
          state,
          postQuestion.rejected(
            new Error("Request failed"),
            "request-2",
            {
              title: "New question",
              description: "Question description",
              tags: [],
            },
            "Unable to post question",
          ),
        ),
      ).toEqual({
        ...state,
        loading: false,
        error: "Unable to post question",
      });
    });
  });
});
