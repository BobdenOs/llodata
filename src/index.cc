#include <napi.h>

#include "../build/odata_parser.h"

class LLOData : public Napi::ObjectWrap<LLOData>
{
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  LLOData(const Napi::CallbackInfo &info);

  Napi::Env *_env;
  Napi::FunctionReference _cb;
  Napi::ObjectReference cqn;

private:
  Napi::Value Parse(const Napi::CallbackInfo &info);

  odata_parser_t s;
};

Napi::Object LLOData::Init(Napi::Env env, Napi::Object exports)
{
  Napi::Function func =
      DefineClass(env, "LLOData", {InstanceMethod("parse", &LLOData::Parse)});

  Napi::FunctionReference *constructor = new Napi::FunctionReference();
  *constructor = Napi::Persistent(func);
  env.SetInstanceData(constructor);

  exports.Set("LLOData", func);
  return exports;
}

LLOData::LLOData(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<LLOData>(info)
{
  Napi::Env env = info.Env();

  if (info.Length() <= 0 || !info[0].IsObject())
  {
    Napi::TypeError::New(env, "Invalid Arguments").ThrowAsJavaScriptException();
    return;
  }

  Napi::Object options = info[0].As<Napi::Object>();

  _cb = Napi::Persistent(options.Get(Napi::String::New(env, "cb")).As<Napi::Function>());

  odata_parser_init(&s);
  s.parent = (uint64_t)this;
}

Napi::Value LLOData::Parse(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  _env = &env;

  int length = info.Length();
  if (length <= 0 || !info[0].IsBuffer())
  {
    Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<const char> chunk = info[0].As<Napi::Buffer<const char>>();

  const char *start = chunk.Data();
  const char *end = start + chunk.Length();

  int code = odata_parser_execute(&s, start, end);

  _env = nullptr;
  if (code)
  {
    Napi::TypeError::New(env, s.reason).ThrowAsJavaScriptException();
  }

  return Napi::Number::New(env, code);
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  return LLOData::Init(env, exports);
}

extern "C"
{
  int skip() { return 0; }

  int on_path_seg(odata_parser_t *s, const char *p, const char *endp)
  {
    if (p == endp)
      return 0;

    LLOData *parent = (LLOData *)s->parent;
    Napi::Env env = *parent->_env;

    if (s->path_state == 0)
    {
      Napi::Object from = Napi::Object::New(env);
      Napi::Array ref = Napi::Array::New(env);
      from.Set("ref", ref);
      parent->cqn.Get("SELECT").As<Napi::Object>().Set("from", from);
      skip(); // fprintf(stdout, "\"from\":{\"ref\":[", (int) (endp - p), p);
    }
    else
    {
      if (s->path_key_type > 0)
      {
        skip(); // fprintf(stdout, "]");
        s->path_key_type = 0;
      }
      skip(); // fprintf(stdout, "},");
    }

    s->path_state += 1;

    Napi::Array ref = parent->cqn.Get("SELECT").As<Napi::Object>().Get("from").As<Napi::Object>().Get("ref").As<Napi::Array>();
    ref.Set(ref.Length(), Napi::String::New(env, p, (size_t)(endp - p)));
    skip(); // fprintf(stdout, "{\"id\":\"%.*s\"", (int) (endp - p), p);
    return 0;
  }

  int on_query_name(odata_parser_t *s, const char *p, const char *endp)
  {
    if (p == endp)
      return 0;

    return 0;
  }

  int on_query_value(odata_parser_t *s, const char *p, const char *endp)
  {
    if (p == endp)
      return 0;

    return 0;
  }

  int on_path_key_simple(odata_parser_t *s, const char *p, const char *endp)
  {
    if (p == endp || s->path_key_type != 0)
      return 0;

    LLOData *parent = (LLOData *)s->parent;
    Napi::Env env = *parent->_env;

    Napi::Array ref = parent->cqn.Get("SELECT").As<Napi::Object>().Get("from").As<Napi::Object>().Get("ref").As<Napi::Array>();
    Napi::String id = ref.Get(ref.Length() - 1).As<Napi::String>();
    Napi::Object entity = Napi::Object::New(env);
    Napi::Array where = Napi::Array::New(env);
    Napi::Object val = Napi::Object::New(env);
    Napi::String value = Napi::String::New(env, p, (size_t)(endp - p));

    val.Set("val", value);

    where.Set(uint32_t(0), val);
    entity.Set("id", id);
    entity.Set("where", where);

    ref.Set(ref.Length() - 1, entity);

    skip(); // fprintf(stdout, ",\"where\":[{\"val\":\"%.*s\"}]", (int) (endp - p), p);
    return 0;
  }

  int on_path_key_property(odata_parser_t *s, const char *p, const char *endp)
  {
    if (p == endp || s->path_key_type == 0)
      return 0;

    LLOData *parent = (LLOData *)s->parent;
    Napi::Env env = *parent->_env;

    Napi::Array where;
    Napi::Array ref = parent->cqn.Get("SELECT").As<Napi::Object>().Get("from").As<Napi::Object>().Get("ref").As<Napi::Array>();

    if (s->path_key_type == 1)
    {
      where = Napi::Array::New(env);
      Napi::String id = ref.Get(ref.Length() - 1).As<Napi::String>();
      Napi::Object entity = Napi::Object::New(env);
      entity.Set("id", id);
      entity.Set("where", where);
      ref.Set(ref.Length() - 1, entity);

      skip(); // fprintf(stdout, ",\"where\":[");
    }
    else
    {
      where = ref.Get(ref.Length() - 1).As<Napi::Object>().Get("where").As<Napi::Array>();
      where.Set(where.Length(), Napi::String::New(env, "and"));
      skip(); // fprintf(stdout, ",\"and\",");
    }

    s->path_key_type += 1;

    Napi::Object column = Napi::Object::New(env);
    Napi::String entity = Napi::String::New(env, p, (size_t)(endp - p));
    Napi::Array entityArr = Napi::Array::New(env);
    entityArr.Set(uint32_t(0), entity);
    column.Set("ref", entityArr);

    where.Set(where.Length(), column);

    skip(); // fprintf(stdout, "{\"ref\":[\"%.*s\"]}", (int) (endp - p), p);

    return 0;
  }

  int on_path_key_value(odata_parser_t *s, const char *p, const char *endp)
  {
    if (p == endp)
      return 0;

    LLOData *parent = (LLOData *)s->parent;
    Napi::Env env = *parent->_env;

    Napi::Array ref = parent->cqn.Get("SELECT").As<Napi::Object>().Get("from").As<Napi::Object>().Get("ref").As<Napi::Array>();
    Napi::Array where = ref.Get(ref.Length() - 1).As<Napi::Object>().Get("where").As<Napi::Array>();

    where.Set(where.Length(), Napi::String::New(env, "="));

    Napi::Object val = Napi::Object::New(env);
    val.Set("val", Napi::String::New(env, p, (size_t)(endp - p)));
    where.Set(where.Length(), val);

    skip(); // fprintf(stdout, ",\"=\",{\"val\":\"%.*s\"}", (int) (endp - p), p);

    return 0;
  }

  int on_start(odata_parser_t *s, const char *p, const char *endp)
  {
    LLOData *parent = (LLOData *)s->parent;
    Napi::Env env = *parent->_env;
    parent->cqn = Napi::Persistent(Napi::Object::New(env));
    parent->cqn.Set("SELECT", Napi::Object::New(env));
    skip(); // fprintf(stdout, "{\"SELECT\":{");
    return 0;
  }

  int on_complete(odata_parser_t *s, const char *p, const char *endp)
  {
    LLOData *parent = (LLOData *)s->parent;
    parent->_cb.Call(parent->_env->Null(), {parent->cqn.Value()});

    if (s->path_state > 0)
    {
      skip(); // fprintf(stdout, "}]}}");
      s->path_state = 0;
    }

    // fprintf(stdout, "}\n");
    return 0;
  }
}

NODE_API_MODULE(llodata, Init)