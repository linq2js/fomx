import * as React from "react";

import { render, fireEvent } from "@testing-library/react";

import { Field, Form, FormObject, FormProvider } from "./index";

test("basic form", () => {
  const onChangeCallback = jest.fn();
  const validateCallback = jest.fn();
  const onSubmitCallback = jest.fn();
  const onSuccessCallback = jest.fn();
  const ref = React.createRef<FormObject>();
  const { getByTestId } = render(
    <Form
      ref={ref}
      value={{ count: 1 }}
      onChange={onChangeCallback}
      onSubmit={onSubmitCallback}
      onSuccess={onSuccessCallback}
      validate={validateCallback}
      props={{ className: "test-form" }}
    >
      <Field name="count" props={{ "data-testid": "input" }} rules={1} />
      <button type="submit" data-testid="submit" />
    </Form>
  );
  const $input = getByTestId("input") as HTMLInputElement;
  const $submit = getByTestId("submit");
  expect($input.value).toBe("1");
  fireEvent.change($input, { target: { value: "2" } });
  expect(onChangeCallback).toBeCalledTimes(1);
  // should not call onChange twice
  fireEvent.change($input, { target: { value: "2" } });
  expect(onChangeCallback).toBeCalledTimes(1);
  fireEvent.change($input, { target: { value: "3" } });
  expect(onChangeCallback).toBeCalledTimes(2);
  expect(ref.current?.value).toEqual({ count: "3" });
  expect(document.querySelector(".test-form")).not.toBeNull();
  fireEvent.click($submit);
  expect(validateCallback).toBeCalledTimes(1);
  expect(onSubmitCallback).toBeCalledTimes(1);
  expect(onSuccessCallback).toBeCalledTimes(1);
});
