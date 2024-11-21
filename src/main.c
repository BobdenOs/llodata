#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/time.h>

#include "../build/odata_parser.h"

int skip() {return 0;}

int on_path_seg(odata_parser_t* s, const char* p, const char* endp) {
  if (p == endp)
    return 0;

  if(s->path_state == 0)
    skip(); // fprintf(stdout, "\"from\":{\"ref\":[", (int) (endp - p), p);
  else {
    if(s->path_key_type > 0) {
      skip(); // fprintf(stdout, "]");
      s->path_key_type = 0;
    }
    skip(); // fprintf(stdout, "},");
  }

  s->path_state+=1;
  skip(); // fprintf(stdout, "{\"id\":\"%.*s\"", (int) (endp - p), p);
  return 0;
}

int on_query_name(odata_parser_t* s, const char* p, const char* endp) {
  if (p == endp)
    return 0;

  return 0;
}

int on_query_value(odata_parser_t* s, const char* p, const char* endp) {
  if (p == endp)
    return 0;

  return 0;
}

int on_path_key_simple(odata_parser_t* s, const char* p, const char* endp) {
  if (p == endp || s->path_key_type != 0)
    return 0;

  skip(); // fprintf(stdout, ",\"where\":[{\"val\":\"%.*s\"}]", (int) (endp - p), p);
  return 0;
}

int on_path_key_property(odata_parser_t* s, const char* p, const char* endp) {
  if (p == endp || s->path_key_type == 0)
    return 0;

  if(s->path_key_type == 1)
    skip(); // fprintf(stdout, ",\"where\":[");
  else
    skip(); // fprintf(stdout, ",\"and\",");

  s->path_key_type += 1;

  skip(); // fprintf(stdout, "{\"ref\":[\"%.*s\"]}", (int) (endp - p), p);

  return 0;
}

int on_path_key_value(odata_parser_t* s, const char* p, const char* endp) {
  if (p == endp)
    return 0;

  skip(); // fprintf(stdout, ",\"=\",{\"val\":\"%.*s\"}", (int) (endp - p), p);

  return 0;
}

int on_start(odata_parser_t* s, const char* p, const char* endp) {
  skip(); // fprintf(stdout, "{\"SELECT\":{");
  return 0;
}

int on_complete(odata_parser_t* s, const char* p, const char* endp) {
  if(s->path_state > 0) {
    skip(); // fprintf(stdout, "}]}}");
    s->path_state = 0;
  }

  fprintf(stdout, "}\n");
  return 0;
}


int main(int argc, char** argv) {
  odata_parser_t s;

  odata_parser_init(&s);

  for (;;) {
    char buf[16384];
    const char* input;
    const char* endp;
    int code;

    input = fgets(buf, sizeof(buf), stdin);
    if (input == NULL)
      break;

    endp = input + strlen(input);
    code = odata_parser_execute(&s, input, endp);
    if (code != 0) {
      skip(); // fprintf(stderr, "code=%d error=%d reason=%s\n", code, s.error, s.reason);
      return -1;
    }
  }

  return 0;
}
