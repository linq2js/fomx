import * as React from "react";

export type FieldName = string | number | FieldPath;

export type FieldPath = (string | number)[];

export type FormValue = Record<string, any>;

export type StoreGetter = () => any;

export type StoreSetter = (value: any, options: any) => void;

export type FieldEvent = "onChange" | "onBlur" | "onSubmit" | "onFocus";

export type Status = "initial" | "busy" | "valid" | "invalid";

export type Validator = (context: ValidationContext) => any;

export type EventDispatcher = (
  event: FieldEvent,
  field: InternalField,
  data?: any
) => void;

export type FieldRenderer = (
  field: FieldObject,
  content: React.ReactNode
) => React.ReactNode;

export type FormRenderer = (
  form: FormObject,
  content: React.ReactNode
) => React.ReactNode;

export interface ValidationContext {
  type: "form" | "field";
  form: FormObject;
  value: any;
  rules: any;
  field?: FieldObject;
  text?: string;
  update(value: any): void;
}

export interface ValidationError {
  form: FormObject;
  field?: FieldObject;
  error: any;
}

export interface FormProviderProps {
  validate?: Validator;
  native?: boolean;
  blur?: boolean | string;
  focus?: boolean | string;
  renderField?: FieldRenderer;
  renderForm?: FormRenderer;
}

export interface FormProps {
  mode?: FieldEvent;
  value?: FormValue;
  rules?: ((value: any) => any) | any;
  validate?: Validator;
  onChange?: (value: any) => void;
  onSubmit?: (value: any) => void;
  onSuccess?: (value: any) => void;
  onError?: (errors: ValidationError[], value: any) => void;
  native?: boolean;
  children?: React.ReactNode | ((form: FormObject) => React.ReactNode);
  props?: React.FormHTMLAttributes<any>;
}

export interface FormObject {
  readonly id: string;
  readonly value: any;
  readonly busy: boolean;
  readonly valid: boolean;
  submit(): void;
  reset(): void;
}

export interface FieldObject {
  key: string;
  id: string;
  text: string;
  path: FieldPath;
  props: FieldProps;
  status: Status;
  dirty: boolean;
  focused: boolean;
  error: any;
  readonly form: FormObject;
  readonly value: any;
  onChange(value: any): void;
  onBlur(): void;
  onFocus(): void;
}

export interface FieldProps<T = any> {
  label?: any;
  name: FieldName;
  comp?: React.FunctionComponent<T> | React.ComponentClass<T> | string;
  props?: Partial<T> | ((field: FieldObject) => T);
  value?: any;
  rules?: any;
  blur?: boolean | string;
  focus?: boolean | string;
  change?: string;
  onChange?: (field: FieldObject) => void;
  onFocus?: (field: FieldObject) => void;
  onBlur?: (field: FieldObject) => void;
  data?: any;
  group?: boolean;
  children?: React.ReactNode | ((field: FieldObject) => React.ReactNode);
}

interface ValueStore {
  getValue(name: FieldName): any;
  setValue(
    name: FieldName,
    value: any,
    onChange?: () => void,
    options?: any
  ): void;
}

interface InternalForm extends FieldContainer, FormObject {
  update(props: FormProps): void;
}

interface InternalField extends FieldObject {
  container?: FieldContainer;
  validationPromise?: Promise<any>;
  reset(): void;
}

interface FieldContainer extends ValueStore {
  readonly form: FormObject;
  render(props: FieldProps<any>, children: any): any;
  dispatch(event: FieldEvent, field: InternalField): void;
}

const providerContext = React.createContext<FormProviderProps>(null as any);
const fieldContainerContext = React.createContext<{
  container: FieldContainer;
}>(null as any);
const DEFAULT_VALUE = {};
const NOOP = () => {};

export const FormProvider: React.FC<FormProviderProps> = ({
  children,
  ...props
}) => {
  return React.createElement(
    providerContext.Provider,
    { value: props },
    children
  );
};

export const Form = React.forwardRef<FormObject, FormProps>(
  (props, ref): any => {
    const provider = React.useContext(providerContext) || {};
    const {
      native = provider.native,
      validate = provider.validate,
      mode = "onSubmit",
      props: htmlFormProps,
      ...otherProps
    } = props;
    const formRef = React.useRef<InternalForm>();
    const rerender = React.useState()[1];
    const form =
      formRef.current ||
      (formRef.current = createForm(
        () => rerender({} as any),
        provider.renderField
      ));

    form.update({
      mode,
      validate,
      native,
      ...otherProps,
    });

    React.useImperativeHandle(ref, () => form);

    const handleSubmit = React.useCallback(
      (e: React.SyntheticEvent) => {
        e.preventDefault();
        form.submit();
      },
      [form]
    );

    const content =
      typeof props.children === "function"
        ? props.children(form)
        : React.createElement(
            fieldContainerContext.Provider,
            { value: { container: form } },
            props.children
          );

    if (provider.renderForm) {
      return provider.renderForm(form, content);
    }

    if (native) {
      return content;
    }

    return React.createElement("form", {
      ...htmlFormProps,
      onSubmit: handleSubmit,
      children: content,
    });
  }
);

export function Field<T = any>({
  children,
  ...props
}: React.PropsWithChildren<FieldProps<T>>) {
  const provider = React.useContext(providerContext) || {};
  const container = React.useContext(fieldContainerContext).container;
  if (!container) {
    throw new Error("No Form element found");
  }
  return container.render(
    {
      blur: provider.blur,
      focus: provider.focus,
      ...props,
    },
    children
  );
}

function generateId() {
  return Math.random().toString(36).substr(2);
}

function createForm(
  rerender: () => void,
  renderField: FieldRenderer | undefined
) {
  const props: FormProps = {};
  const id = generateId();

  let fields: Record<string, InternalField> = {};
  let prevFields: Record<string, InternalField>;
  let formValue: any;
  let validationPromise: Promise<void> | undefined;
  const errors = new Map<FieldObject | FormObject, any>();
  const promises: Promise<void>[] = [];

  function validateField(field: InternalField, shouldRerender: boolean) {
    if (!field.props.rules) return;
    if (!props.validate) return;
    const rules =
      typeof field.props.rules === "function"
        ? field.props.rules(formValue)
        : field.props.rules;
    const value = field.value;
    field.status = "busy";
    field.error = undefined;
    try {
      const result = props.validate({
        type: "field",
        field,
        form,
        text: field.text,
        value,
        rules,
        update: (nomalizedValue) => {
          if (nomalizedValue === value) return;
          container.setValue(field.path, nomalizedValue, undefined, {
            forceUpdate: true,
          });
        },
      });
      // async validation
      if (result && typeof result.then === "function") {
        field.validationPromise = result;
        return new Promise<void>((resolve, reject) => {
          result
            .then(() => {
              if (result !== field.validationPromise) return;
              field.status = "valid";
              rerender();
              resolve();
            })
            .catch((error: any) => {
              if (result !== field.validationPromise) return;
              field.status = "invalid";
              field.error = error;
              errors.set(field, error);
              rerender();
              reject();
            });
        });
      } else {
        field.status = "valid";
      }
    } catch (error) {
      field.error = error;
      field.status = "invalid";
      errors.set(field, error);
    }
    if (shouldRerender) {
      rerender();
    }
  }

  function validateForm(
    onSuccess?: (value: any) => void,
    onError?: (errors: ValidationError[], value: any) => void
  ) {
    promises.length = 0;
    errors.clear();
    const value = getValue();

    validationPromise = undefined;

    if (props.rules && props.validate) {
      const rules =
        typeof props.rules === "function" ? props.rules(form) : props.rules;
      try {
        const result = props.validate({
          type: "form",
          form,
          value,
          rules,
          update: NOOP,
        });
        if (result && typeof result.then === "function") {
          validationPromise = result;
          result
            .then(() => {
              if (result !== validationPromise) return;
              validationPromise = undefined;
            })
            .catch((error: any) => {
              if (result !== validationPromise) return;
              validationPromise = undefined;
              errors.set(form, error);
            });
        }
      } catch (e) {
        errors.set(form, e);
      }
    }

    Object.values(fields).forEach((field) => {
      const result = validateField(field, false);
      if (result && typeof result.then) {
        promises.push(result);
      }
    });

    if (promises.length) {
      Promise.all(promises).finally(() => {
        if (errors.size) {
          onError;
        }
      });
    } else if (errors.size) {
      onError?.(Array.from(errors.values()), value);
    } else {
      onSuccess?.(value);
    }

    rerender();
  }

  function register(name: FieldName, props: FieldProps) {
    const path = Array.isArray(name) ? name : [name];
    const key = path.join("/");
    let field: InternalField;
    if (key in fields) {
      field = fields[key];
    } else if (prevFields && key in prevFields) {
      field = prevFields[key];
    } else {
      field = createField(container, `${id}__${key}`, key, path);
    }
    field.props = props;
    field.text =
      typeof props.label === "string"
        ? props.label
        : String(field.path.slice(-1));
    fields[key] = field;
    return field;
  }

  function getValue() {
    return formValue || props.value || DEFAULT_VALUE;
  }

  const form = {
    id,
    get valid() {
      return !errors.size;
    },
    get busy() {
      return promises.length > 0;
    },
    get value() {
      return getValue();
    },
    submit() {
      const value = getValue();
      props.onSubmit?.(value);
      validateForm(props.onSuccess, props.onError);
    },
    reset() {
      formValue = undefined;
      validationPromise = undefined;
      Object.values(fields).forEach((field) => {
        field.reset();
      });
      rerender();
    },
    update(nextProps) {
      Object.assign(props, nextProps);
      prevFields = fields;
      fields = {};
    },
  } as InternalForm;

  const container = createFieldContainer(
    form,
    getValue,
    (value, options) => {
      formValue = value;
      if (options && options.forceUpdate) {
        return;
      }
      props.onChange?.(value);
    },
    register,
    renderField,
    (event, field) => {
      if (event === "onChange") {
        validationPromise = undefined;
        if (props.mode === "onChange") {
          validateForm();
        } else {
          rerender();
        }
      } else if (event === "onBlur") {
        field.focused = false;
        rerender();
      } else if (event === "onFocus") {
        field.focused = true;
        rerender();
      }
    }
  );

  Object.assign(form, container);

  return form;
}

function createField(
  container: FieldContainer,
  id: string,
  key: string,
  path: FieldPath
) {
  let fieldValue: any;
  const field: InternalField = {
    key,
    id,
    path,
    text: "",
    props: null as any,
    status: "initial",
    dirty: false,
    focused: false,
    error: undefined,
    get form() {
      return container.form;
    },
    get value() {
      if (field.dirty) {
        return fieldValue;
      }

      if ("value" in field.props) {
        return field.props.value;
      }

      return container.getValue(field.path);
    },
    reset() {
      field.status = "initial";
      field.focused = false;
      field.dirty = false;
      field.validationPromise = undefined;
      fieldValue = DEFAULT_VALUE;
    },
    onChange(value: any) {
      // is event object
      if (
        typeof value === "object" &&
        "target" in value &&
        "preventDefault" in value
      ) {
        const target = value.target;
        if (target.type === "checkbox" || target.type === "radio") {
          value = target.checked;
        } else {
          value = target.value;
        }
      }
      container.setValue(path, value, () => {
        fieldValue = value;
        field.dirty = true;
        field.validationPromise = undefined;
        field.props.onChange?.(field);
        container.dispatch("onChange", field);
      });
    },
    onBlur() {
      field.props.onBlur?.(field);
      container.dispatch("onBlur", field);
    },
    onFocus() {
      field.props.onFocus?.(field);
      container.dispatch("onFocus", field);
    },
  };

  return field;
}

function createFieldContainer(
  form: FormObject,
  getter: StoreGetter,
  setter: StoreSetter,
  register: (name: FieldName, props: FieldProps) => InternalField,
  renderField: FieldRenderer | undefined,
  dispatch: EventDispatcher
): FieldContainer {
  const { getValue, setValue } = createValueStore(getter, setter);
  return {
    form,
    getValue,
    setValue,
    dispatch(...args) {
      dispatch(...args);
    },
    render(props, children) {
      const field = register(props.name, props);
      // is group
      if (props.group) {
        if (!field.container) {
          field.container = createFieldContainer(
            form,
            () => {
              return getValue(field.path);
            },
            (value) => {
              setValue(field.path, value);
            },
            (name, props) => {
              return register(field.path.concat(name), props);
            },
            renderField,
            dispatch
          );
        }
        return React.createElement(
          fieldContainerContext.Provider,
          { value: { container: field.container } },
          typeof children === "function" ? children(field) : children
        );
      }

      if (typeof children === "function") {
        return children(field);
      }

      const mappedProps: Record<string, any> = {
        value: field.value,
        [props.change || "onChange"]: field.onChange,
      };

      if (field.props.blur) {
        mappedProps[
          typeof field.props.blur === "string" ? field.props.blur : "onBlur"
        ] = field.onBlur;
      }

      if (field.props.focus) {
        mappedProps[
          typeof field.props.focus === "string" ? field.props.focus : "onFocus"
        ] = field.onFocus;
      }

      const content = React.createElement(field.props.comp || "input", {
        ...mappedProps,
        ...(typeof field.props.props === "function"
          ? field.props.props(field)
          : field.props.props),
      });

      return renderField ? renderField(field, content) : content;
    },
  };
}

function createValueStore(
  getter: StoreGetter,
  setter: StoreSetter
): ValueStore {
  function getValue(path: FieldPath) {
    return path.reduce(
      (prev, prop) => (prev ? prev[prop] : undefined),
      getter()
    );
  }

  return {
    getValue(name: FieldName) {
      if (Array.isArray(name)) {
        return getValue(name);
      }
      return getter()[name];
    },
    setValue(name, value, onChange, options) {
      if (Array.isArray(name)) {
        const prevValue = getValue(name);
        if (prevValue === value) return;

        const updateProp = (
          obj: any,
          [prop, ...nestedProps]: FieldPath
        ): any => {
          const prevPropValue = obj ? obj[prop] : undefined;
          const nextPropValue = nestedProps.length
            ? updateProp(prevPropValue, nestedProps)
            : value;
          if (nextPropValue === prevPropValue) {
            return obj;
          }
          return { ...obj, [prop]: nextPropValue };
        };

        const prevObject = getter();
        const nextObject = updateProp(prevObject, name);

        if (nextObject !== prevObject) {
          setter(nextObject, options);
          onChange?.();
        }

        return;
      }

      const obj = getter();
      if (obj[name] === value) {
        return;
      }
      setter({ ...obj, [name]: value }, options);
      onChange?.();
    },
  };
}
