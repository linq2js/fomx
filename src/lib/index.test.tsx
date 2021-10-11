import * as React from "react";

import { render, fireEvent } from "@testing-library/react";

import { Field, Form, FormRef } from "./index";

test("basic form", () => {
  const onChangeCallback = jest.fn();
  const validateCallback = jest.fn();
  const onSubmitCallback = jest.fn();
  const onSuccessCallback = jest.fn();
  const ref = React.createRef<FormRef>();
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

test("field array", () => {
  let value = { array: [1, 2, 3] };
  const { getByTestId } = render(
    <Form onSuccess={(x) => (value = x)} value={value}>
      <Field
        item
        name="array"
        props={(field) => ({ "data-testid": `item${field.index}` })}
      />
      <Field actions name="array">
        {({ push, pop, swap }) => (
          <>
            <button data-testid="push" onClick={() => push(4)} />
            <button data-testid="pop" onClick={() => pop()} />
            <button data-testid="swap" onClick={() => swap(2, 0)} />
          </>
        )}
      </Field>
    </Form>
  );
  expect((getByTestId("item0") as HTMLInputElement).value).toBe("1");
  expect((getByTestId("item1") as HTMLInputElement).value).toBe("2");
  expect((getByTestId("item2") as HTMLInputElement).value).toBe("3");
  const $push = getByTestId("push");
  const $pop = getByTestId("pop");
  const $swap = getByTestId("swap");
  fireEvent.click($push);
  expect((getByTestId("item3") as HTMLInputElement).value).toBe("4");
  expect(value.array).toEqual([1, 2, 3, 4]);
  fireEvent.click($pop);
  expect(value.array).toEqual([1, 2, 3]);
  fireEvent.click($swap);
  expect((getByTestId("item0") as HTMLInputElement).value).toBe("3");
  expect((getByTestId("item2") as HTMLInputElement).value).toBe("1");
});
