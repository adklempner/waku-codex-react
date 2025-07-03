import { Field, Type, Root } from 'protobufjs';
import { BaseProtocol } from '@/types';

export class ProtobufProtocol<T extends Record<string, any>> extends BaseProtocol<T> {
  private protoType: Type;

  constructor(
    contentTopic: string,
    schema: {
      name: string;
      fields: Array<{
        name: string;
        type: string;
        id: number;
        rule?: string;
      }>;
    },
    validator: (msg: unknown) => msg is T
  ) {
    super(contentTopic, validator);
    
    // Create protobuf type
    const root = new Root();
    this.protoType = new Type(schema.name);
    
    schema.fields.forEach(field => {
      this.protoType.add(new Field(field.name, field.id, field.type, field.rule));
    });
    
    root.add(this.protoType);
  }

  encode(message: T): Uint8Array {
    const errMsg = this.protoType.verify(message);
    if (errMsg) {
      throw new Error(`Invalid message: ${errMsg}`);
    }
    
    const protoMessage = this.protoType.create(message);
    return this.protoType.encode(protoMessage).finish();
  }

  decode(data: Uint8Array): T {
    const decoded = this.protoType.decode(data);
    return this.protoType.toObject(decoded) as T;
  }
}

// Helper function to create a protobuf protocol
export function createProtobufProtocol<T extends Record<string, any>>(
  contentTopic: string,
  schema: {
    name: string;
    fields: Array<{
      name: string;
      type: string;
      id: number;
      rule?: string;
    }>;
  },
  validator: (msg: unknown) => msg is T
): ProtobufProtocol<T> {
  return new ProtobufProtocol(contentTopic, schema, validator);
}