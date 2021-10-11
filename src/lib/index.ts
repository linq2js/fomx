import * as React from "react";

export type FieldName = string | number | FieldPath;

export type FieldPath = (string | number)[];

export type FormValue = Record<string, any>;

export type StoreGetter = () => any;

export type StoreSetter = (value: any, options: any) => void;

export type FieldEvent = "onChange" | "onBlur" | "onSubmit" | "onFocus";

export type FormMode = FieldEvent;

export type Status = "unknown" | "busy" | "valid" | "invalid";

export type Validator = (context: ValidationContext) => any;

export type EventDispatcher = (
  event: FieldEvent,
  field: InternalField,
  data?: any
) => void;

export type FieldRenderer = (
  field: FieldRef,
  content: React.ReactNode
) => React.ReactNode;

export type FormRenderer = (
  form: FormRef,
  content: React.ReactNode
) => React.ReactNode;

export interface ValidationContext {
  type: "form" | "field";
  form: FormRef;
  value: any;
  rules: any;
  field?: FieldRef;
  text?: string;
  data?: any;
  transform(value: any): void;
}

export interface ValidationError {
  form: FormRef;
  field?: FieldRef;
  error: any;
}

export interface FormProviderProps {
  mode?: FormMode;
  comp?: React.FunctionComponent<any> | React.ComponentClass<any> | string;
  isolated?: boolean;
  validate?: Validator;
  native?: boolean;
  blur?: boolean | string;
  focus?: boolean | string;
  renderField?: FieldRenderer;
  renderForm?: FormRenderer;
}

export interface FormProps {
  isolated?: boolean;
  mode?: FormMode;
  value?: FormValue;
  rules?: ((value: any) => any) | any;
  validate?: Validator;
  onValidate?: (value: any) => any;
  onChange?: (value: any) => void;
  onSubmit?: (value: any) => void;
  onSuccess?: (value: any) => void;
  onError?: (errors: ValidationError[], value: any) => void;
  native?: boolean;
  children?: React.ReactNode | ((form: FormRef) => React.ReactNode);
  props?: React.FormHTMLAttributes<any>;
}

export interface ArrayMethods {
  push(...values: any[]): void;
  pop(): any;
  unshift(...values: any[]): void;
  shift(): any;
  clear(): void;
  remove(...indexes: number[]): void;
  filter(predicate: (value: any, index: number) => boolean): void;
  swap(from: number, to: number): void;
  splice(index: number, count?: number, ...values: any[]): any[];
  replace(withValue: any, ...values: any[]): void;
  fill(value: any): void;
  insert(index: number, ...values: any[]): void;
}

export interface FieldArrayProps {
  field: FieldRef;
  props: FieldProps;
  children: any;
}

export interface FormRef {
  readonly id: string;
  readonly value: any;
  readonly busy: boolean;
  readonly valid: boolean;
  readonly props: FormProps;
  readonly dirty: boolean;
  submit(): void;
  reset(): void;
}

export interface FieldRef<T = any> extends ArrayMethods {
  readonly key: string;
  readonly id: string;
  readonly text: string;
  readonly path: FieldPath;
  readonly props: FieldProps;
  readonly status: Status;
  readonly dirty: boolean;
  readonly focused: boolean;
  readonly touched: boolean;
  readonly error: any;
  readonly form: FormRef;
  readonly value: T;
  readonly label: any;
  readonly ref: any;
  readonly index?: number;
  $ref?: React.MutableRefObject<any>;
  onChange(value: T): void;
  onBlur(): void;
  onFocus(): void;
  update(value: T): void;
}

export interface FieldProps<T = any> {
  label?: any;
  name: FieldName;
  text?: string;
  comp?: React.FunctionComponent<T> | React.ComponentClass<T> | string;
  props?: Partial<T> | ((field: FieldRef) => T);
  value?: any;
  rules?: any;
  blur?: boolean | string;
  focus?: boolean | string;
  change?: string;
  onValidate?: (field: FieldRef) => void;
  onChange?: (field: FieldRef) => void;
  onFocus?: (field: FieldRef) => void;
  onBlur?: (field: FieldRef) => void;
  data?: any;
  index?: number;
  group?: boolean;
  item?: boolean | ((value: any, index: number) => any);
  actions?: boolean;
  children?: React.ReactNode | ((field: FieldRef) => React.ReactNode);
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

interface InternalForm extends FieldContainer, FormRef {
  readonly changeToken: any;
  unregister(field: InternalField): void;
  update(props: FormProps): void;
  invalidate(key: string): void;
}

interface InternalField extends FieldRef {
  container?: FieldContainer;
  validationPromise?: Promise<any>;
  ref: any;
  status: Status;
  error: any;
  index?: number;
  props: FieldProps;
  text: string;
  dirty: boolean;
  focused: boolean;
  touched: boolean;
  label: any;
  $rerender?: () => void;
  invalidate(): void;
  rerender(): void;
  reset(): void;
}

interface FieldContainer extends ValueStore {
  readonly form: FormRef;
  Render(props: FieldProps<any>, children: any): any;
  dispatch(event: FieldEvent, field: InternalField): void;
}

const providerContext = React.createContext<FormProviderProps>(null as any);
const fieldContainerContext = React.createContext<{
  container: FieldContainer;
}>(null as any);
const DEFAULT_VALUE = {};
const NOOP = () => {};
const EMPTY_ARRAY: any[] = [];

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

export const Form = React.forwardRef<FormRef, FormProps>((props, ref): any => {
  const provider = React.useContext(providerContext) || {};
  const {
    native = provider.native,
    validate = provider.validate,
    mode = provider.mode || "onSubmit",
    isolated = provider.isolated,
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
    isolated,
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

  const content = React.createElement(
    fieldContainerContext.Provider,
    { value: { container: form } },
    typeof props.children === "function" ? props.children(form) : props.children
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
});

export function Field<T = any>({
  children,
  ...props
}: React.PropsWithChildren<FieldProps<T>>) {
  const provider = React.useContext(providerContext) || {};
  const container = React.useContext(fieldContainerContext).container;
  if (!container) {
    throw new Error("No Form element found");
  }
  const {
    blur = provider.blur,
    focus = provider.focus,
    comp = provider.comp || "input",
    ...otherProps
  } = props;

  return container.Render(
    {
      blur,
      focus,
      comp,
      ...otherProps,
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
  let validateToken: any;
  let changeToken = {};
  let dirty = false;
  const errors = new Map<FieldRef | FormRef, any>();
  const promises: Promise<void>[] = [];

  function validateField(field: InternalField, shouldRerender: boolean) {
    if (!field.props.rules) return;
    if (!props.validate) return;

    if (field.status === "busy" && field.validationPromise) {
      promises.push(field.validationPromise);
      return;
    }

    if (field.status === "invalid" && field.error) {
      errors.set(field, field.error);
      return;
    }

    if (field.status === "valid") {
      return;
    }

    const value = field.value;
    const rules =
      typeof field.props.rules === "function"
        ? field.props.rules(formValue)
        : field.props.rules;

    field.status = "busy";
    field.error = undefined;
    try {
      let result = props.validate({
        type: "field",
        field,
        form,
        text: field.text,
        value,
        rules,
        data: field.props.data,
        transform: (nomalizedValue) => {
          if (nomalizedValue === value) return;
          container.setValue(field.path, nomalizedValue, undefined, {
            forceUpdate: true,
          });
        },
      });
      let onValidate = field.props.onValidate;

      if (!(result && typeof result.then === "function")) {
        if (onValidate) {
          result = onValidate(field);
          onValidate = undefined;
        } else {
          field.status = "valid";
        }
      }

      // async validation
      if (result && typeof result.then === "function") {
        field.validationPromise = result;
        return new Promise<void>((resolve) => {
          result
            .then(() => {
              if (result !== field.validationPromise) return;
              return onValidate && onValidate(field);
            })
            .then(() => {
              if (result !== field.validationPromise) return;
              field.status = "valid";
              resolve();
              rerender();
            })
            .catch((error: any) => {
              if (result !== field.validationPromise) return;
              field.status = "invalid";
              field.error = error;
              errors.set(field, error);
              resolve();
              rerender();
            });
        });
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
    validateToken = {};
    validationPromise = undefined;

    Object.values(fields).forEach((field) => {
      const result = validateField(field, false);
      if (result && typeof result.then) {
        promises.push(result);
      }
    });

    const validators: ((form: FormRef) => any)[] = [];

    if (props.rules && props.validate) {
      validators.push(() => {
        const rules =
          typeof props.rules === "function" ? props.rules(form) : props.rules;

        return props.validate?.({
          type: "form",
          form,
          value,
          rules,
          transform: NOOP,
        });
      });
    }

    if (props.onValidate) {
      validators.push(props.onValidate);
    }

    if (validators.length) {
      const callValidator = (): any => {
        validationPromise = undefined;

        const validator = validators.shift();
        if (!validator) return;

        try {
          const result = validator(form);
          if (result && typeof result.then === "function") {
            validationPromise = result;
            return result
              .then(() => {
                if (result !== validationPromise) return;
                return callValidator();
              })
              .catch((error: any) => {
                if (result !== validationPromise) return;
                validationPromise = undefined;
                errors.set(form, error);
              });
          }
          return callValidator();
        } catch (e) {
          errors.set(form, e);
          validationPromise = undefined;
        }
      };

      callValidator();
    }

    if (promises.length) {
      const token = validateToken;
      Promise.all(promises).finally(() => {
        if (token !== validateToken) {
          return;
        }

        promises.length = 0;
        if (errors.size) {
          onError && onError(Array.from(errors.values()), value);
        }
        rerender();
      });
    } else if (errors.size) {
      onError && onError(Array.from(errors.values()), value);
    } else {
      onSuccess?.(value);
    }

    rerender();
  }

  function register(name: FieldName, props: FieldProps) {
    const path = Array.isArray(name) ? name : [name];
    const key = getKeyFromPath(path);
    let field: InternalField;
    if (key in fields) {
      field = fields[key];
    } else if (prevFields && key in prevFields) {
      field = prevFields[key];
    } else {
      field = createField(container, `${id}__${key}`, key, path);
    }
    if (!props.actions) {
      field.index = props.index;
      field.props = props;

      field.label =
        typeof props.label === "function"
          ? React.createElement(props.label, field)
          : props.label;

      field.text =
        props.text ||
        (typeof field.label === "string"
          ? field.label
          : String(field.path.slice(-1)));
    }

    fields[key] = field;
    return field;
  }

  function getValue() {
    return formValue || props.value || DEFAULT_VALUE;
  }

  const form = {
    id,
    get dirty() {
      return dirty;
    },
    get valid() {
      return !errors.size;
    },
    get busy() {
      return promises.length > 0;
    },
    get value() {
      return getValue();
    },
    get changeToken() {
      return changeToken;
    },
    invalidate(path) {
      const allFields = { ...prevFields, ...fields };
      Object.keys(allFields).forEach((key) => {
        if (key.startsWith(path)) {
          allFields[key].invalidate();
        }
      });
    },
    submit() {
      const value = getValue();
      props.onSubmit?.(value);
      validateForm(props.onSuccess, props.onError);
    },
    reset() {
      dirty = false;
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
    unregister(field) {
      const key = getKeyFromPath(field.path);
      if (prevFields) {
        delete prevFields[key];
      }
      delete fields[key];
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
      let shouldValidate = false;
      let shouldRererender = false;

      if (event === "onChange") {
        dirty = true;
        validationPromise = undefined;
        changeToken = {};
        if (props.mode === "onChange") {
          shouldValidate = true;
        } else {
          shouldRererender = true;
        }
      } else if (event === "onBlur") {
        if (props.mode === "onBlur") {
          shouldValidate = true;
        } else {
          shouldRererender = true;
        }
      } else if (event === "onFocus") {
        shouldRererender = true;
      }

      if (shouldValidate) {
        if (props.isolated) {
          validateField(field, !shouldRererender);
        } else {
          validateForm();
        }
      }

      if (shouldRererender) {
        if (props.isolated) {
          field.rerender();
        } else {
          rerender();
        }
      }
    }
  );

  Object.assign(form, container);

  return form;
}

function createArrayUtil(
  getter: () => any[],
  setter: (value: any[]) => void,
  modifier: (
    original: () => any[],
    modified: (newArray?: any[]) => any[],
    args: any[]
  ) => any
) {
  return (...args: any[]) => {
    let original: any[] | undefined = undefined;
    let modified: any[] | undefined = undefined;
    const getOriginal = () => {
      if (!original) {
        original = getter() || EMPTY_ARRAY;
      }
      return original;
    };
    function getModified(newArray?: any[]) {
      if (arguments.length && newArray) {
        modified = newArray;
        return modified;
      }

      if (!modified) {
        modified = getOriginal().slice();
      }
      return modified;
    }
    const result = modifier(getOriginal, getModified, args);

    if (modified) {
      setter(modified);
    }

    return result;
  };
}

function createField(
  container: FieldContainer,
  id: string,
  key: string,
  path: FieldPath
) {
  let fieldValue: any;
  const get = () => field.value;
  const set = (value: any) => field.update(value);

  const field: InternalField = {
    key,
    id,
    path,
    text: "",
    props: {} as any,
    status: "unknown",
    dirty: false,
    focused: false,
    error: undefined,
    label: undefined,
    touched: false,
    get ref() {
      return field.$ref?.current;
    },
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
    invalidate() {
      if (!field.dirty) return;
      fieldValue = container.getValue(field.path);
    },
    rerender() {
      field.$rerender?.();
    },
    reset() {
      field.status = "unknown";
      field.touched = false;
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
      field.update(value);
    },
    update(value) {
      container.setValue(path, value, () => {
        fieldValue = value;
        field.touched = true;
        field.status = "unknown";
        field.dirty = true;
        field.validationPromise = undefined;
        field.props.onChange?.(field);
        container.dispatch("onChange", field);
      });
    },
    onBlur() {
      field.focused = false;
      field.props.onBlur?.(field);
      container.dispatch("onBlur", field);
    },
    onFocus() {
      field.touched = true;
      field.focused = true;
      field.props.onFocus?.(field);
      container.dispatch("onFocus", field);
    },
    pop: createArrayUtil(get, set, (o, m) => {
      if (!o().length) return undefined;
      return m().pop();
    }),
    shift: createArrayUtil(get, set, (o, m) => {
      if (!o().length) return undefined;
      return m().shift();
    }),
    remove: createArrayUtil(get, set, (o, m, indexes) => {
      const original = o();
      if (!original.length) return;
      if (indexes.length) {
        indexes = indexes.filter((x) => x < original.length).sort();
      }
      if (!indexes.length) return;
      const modified = m();
      while (indexes.length) {
        modified.splice(indexes.shift(), 1);
      }
    }),
    replace: createArrayUtil(get, set, (o, m, [widthValue, ...values]) => {
      const original = o();
      if (!original.length) return;
      const indexes: number[] = [];
      if (values.length === 1) {
        const value = values[0];
        original.forEach((x, i) => x === value && indexes.push(i));
      } else {
        original.forEach((x, i) => {
          values.includes(x) && indexes.push(i);
        });
      }
      if (indexes.length) {
        const modified = m();
        while (indexes.length) {
          modified[indexes.shift() || 0] = widthValue;
        }
      }
    }),
    push: createArrayUtil(get, set, (_, m, items) => {
      if (!items.length) return;
      m().push(...items);
    }),
    unshift: createArrayUtil(get, set, (_, m, items) => {
      if (!items.length) return;
      m().unshift(...items);
    }),
    clear: createArrayUtil(get, set, (o, m) => {
      if (!o().length) return;
      m([]);
    }),
    fill: createArrayUtil(get, set, (o, m, [value]) => {
      if (!o().length) return;
      m(new Array(o().length).fill(value));
    }),
    filter: createArrayUtil(get, set, (o, m, [predicate]) => {
      if (!o().length) return;
      m(o().filter(predicate));
    }),
    swap: createArrayUtil(get, set, (o, m, [from, to]) => {
      const original = o();
      if (!original.length) return;

      if (from < 0) {
        from = 0;
      } else if (from > original.length - 1) {
        from = original.length - 1;
      }
      if (to < 0) {
        to = 0;
      } else if (to > original.length - 1) {
        to = original.length - 1;
      }
      if (from === to) return;
      const modified = m();
      [modified[to], modified[from]] = [modified[from], modified[to]];
    }),
    insert: createArrayUtil(get, set, (o, m, [index, ...values]) => {
      const original = o();
      if (index < 0) {
        index = 0;
      } else if (index >= original.length) {
        index = original.length;
      }
      m().splice(index, 0, ...values);
    }),
    splice: createArrayUtil(get, set, (o, m, [index, count, ...values]) => {
      const original = o();
      if (!original.length) {
        // nothing to insert
        if (!values.length) return [];
        m().splice(index, count, ...values);
      }
      // remove action
      if (!values.length) {
        // nothing to remove
        if (index > original.length - 1 || !count) return [];
        return m().splice(index, count);
      }
      return m().splice(index, count, ...values);
    }),
  };

  return field;
}

function getKeyFromName(name: FieldName) {
  if (Array.isArray(name)) {
    return getKeyFromPath(name);
  }
  return String(name);
}

function getKeyFromPath(path: FieldPath) {
  return path.join("$");
}

function createFieldContainer(
  form: InternalForm,
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
    Render(props, children) {
      const ref = React.useRef<any>();
      const rerender = React.useState<any>()[1];
      const field = register(props.name, props);

      React.useEffect(() => {
        if (props.actions) return;
        return () => {
          (field.form as InternalForm).unregister(field);
        };
      }, [props.actions, field]);

      if (props.actions) {
        return typeof children === "function" ? children(field) : children;
      }

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

      field.$ref = ref;
      field.$rerender = () => rerender({});

      if (typeof children === "function") {
        return children(field);
      }

      let content: React.ReactNode = undefined;

      if (props.comp) {
        if (props.item) {
          content = React.createElement(FieldArray, { field, props, children });
        } else {
          const mappedProps: Record<string, any> = {
            ref,
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
              typeof field.props.focus === "string"
                ? field.props.focus
                : "onFocus"
            ] = field.onFocus;
          }

          content = React.createElement(field.props.comp || "input", {
            ...mappedProps,
            ...(typeof field.props.props === "function"
              ? field.props.props(field)
              : field.props.props),
          });
        }
      }
      return renderField ? renderField(field, content) : content;
    },
  };
}

function FieldArray({ field, props, children }: FieldArrayProps): any {
  const array: any[] = field.value || [];

  return array.map((value, index) =>
    React.createElement(Field, {
      ...props,
      key: typeof props.item === "function" ? props.item(value, index) : index,
      children,
      index,
      item: false,
      name: field.path.concat(index),
    })
  );
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
